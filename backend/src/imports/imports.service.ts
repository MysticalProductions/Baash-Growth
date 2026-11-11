import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { AuditService } from '../audit/audit.service';
import { CsvPreviewDto, CsvConfirmDto } from './dto/import.dto';
import { CustomerSource, ImportStatus, ConsentChannel, ConsentStatus, Gender } from '@prisma/client';

export interface ParsedCsvRow {
  rowNumber: number;
  fullName: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  gender?: string;
  tags?: string;
  notes?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly auditService: AuditService,
  ) {}

  getSampleTemplateCsv(): string {
    const headers = [
      'Full Name',
      'Mobile Phone',
      'Email Address',
      'City',
      'State',
      'Gender',
      'Tags (semicolon separated)',
      'Notes',
    ];

    const sampleRows = [
      ['Rohan Mehra', '+919876543210', 'rohan@example.com', 'Bengaluru', 'Karnataka', 'MALE', 'VIP; Regular', 'VIP experience customer'],
      ['Pooja Hegde', '9812345678', 'pooja@example.com', 'Delhi', 'Delhi', 'FEMALE', 'New Customer; Delhi', 'Event registrant'],
      ['Karan Singh', '', 'karan.singh@gmail.com', 'Mumbai', 'Maharashtra', 'MALE', 'Interested', 'Inquired via website'],
    ];

    return [
      headers.join(','),
      ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
  }

  parseCsv(rawText: string): Array<Record<string, string>> {
    const lines = rawText
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain a header row and at least one data row');
    }

    // Parse header
    const headers = this.parseCsvLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ''),
    );

    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      if (i > 10000) break; // MVP limit 10,000 rows
      const values = this.parseCsvLine(lines[i]);
      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || '';
      });
      rows.push(record);
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  async previewImport(vendorId: string, dto: CsvPreviewDto) {
    const rawRows = this.parseCsv(dto.csvData);

    // Fetch existing customer phone and emails for duplicate matching in this vendor
    const existingCustomers = await this.prisma.customer.findMany({
      where: { vendorId },
      select: { phone: true, email: true },
    });

    const existingPhones = new Set(existingCustomers.map((c) => c.phone).filter(Boolean));
    const existingEmails = new Set(existingCustomers.map((c) => c.email).filter(Boolean));

    const seenInBatchPhones = new Set<string>();
    const seenInBatchEmails = new Set<string>();

    const parsedRows: ParsedCsvRow[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let idx = 0; idx < rawRows.length; idx++) {
      const r = rawRows[idx];
      const rowNum = idx + 2; // +1 for 0-index, +1 for header
      const errors: string[] = [];

      // Extract fuzzy mapped fields
      const fullName =
        r.fullname || r.name || r.customername || r.customer || '';
      const rawPhone =
        r.mobilephone || r.phone || r.mobile || r.phonenumber || r.contact || '';
      const rawEmail = r.emailaddress || r.email || r.mail || '';
      const city = r.city || '';
      const state = r.state || '';
      const gender = (r.gender || '').toUpperCase();
      const tags = r.tags || r.tag || '';
      const notes = r.notes || r.note || '';

      if (!fullName) {
        errors.push('Full name is required');
      }

      const normalizedPhone = this.customersService.normalizePhone(rawPhone);
      const normalizedEmail = this.customersService.normalizeEmail(rawEmail);

      if (!normalizedPhone && !normalizedEmail) {
        errors.push('At least one valid contact method (phone or email) is required');
      }

      let isDuplicate = false;
      if (normalizedPhone) {
        if (existingPhones.has(normalizedPhone) || seenInBatchPhones.has(normalizedPhone)) {
          isDuplicate = true;
          errors.push(`Duplicate phone number: ${normalizedPhone}`);
        }
      }
      if (normalizedEmail) {
        if (existingEmails.has(normalizedEmail) || seenInBatchEmails.has(normalizedEmail)) {
          isDuplicate = true;
          errors.push(`Duplicate email address: ${normalizedEmail}`);
        }
      }

      const isValid = errors.length === 0;

      if (isValid) {
        validCount++;
        if (normalizedPhone) seenInBatchPhones.add(normalizedPhone);
        if (normalizedEmail) seenInBatchEmails.add(normalizedEmail);
      } else if (isDuplicate) {
        duplicateCount++;
      } else {
        invalidCount++;
      }

      parsedRows.push({
        rowNumber: rowNum,
        fullName,
        phone: normalizedPhone || rawPhone,
        email: normalizedEmail || rawEmail,
        city,
        state,
        gender,
        tags,
        notes,
        isValid,
        isDuplicate,
        errors,
      });
    }

    return {
      fileName: dto.fileName || 'customers_upload.csv',
      totalRows: rawRows.length,
      validRows: validCount,
      duplicateRows: duplicateCount,
      invalidRows: invalidCount,
      preview: parsedRows.slice(0, 15),
      invalidDetails: parsedRows.filter((r) => !r.isValid),
    };
  }

  async confirmImport(vendorId: string, dto: CsvConfirmDto, userId?: string, ip?: string) {
    const { rows, fileName = 'customers_import.csv', skipDuplicates = true } = dto;

    if (!rows || rows.length === 0) {
      throw new BadRequestException('No rows provided for import');
    }

    let successCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const errorLog: any[] = [];

    // Pre-cache vendor tags
    const existingTags = await this.prisma.customerTag.findMany({
      where: { vendorId },
    });
    const tagMap = new Map<string, string>();
    existingTags.forEach((t) => tagMap.set(t.name.toLowerCase(), t.id));

    // Existing contacts for duplicate detection
    const existingCustomers = await this.prisma.customer.findMany({
      where: { vendorId },
      select: { phone: true, email: true },
    });
    const existingPhones = new Set(existingCustomers.map((c) => c.phone).filter(Boolean));
    const existingEmails = new Set(existingCustomers.map((c) => c.email).filter(Boolean));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const normalizedPhone = this.customersService.normalizePhone(r.phone);
      const normalizedEmail = this.customersService.normalizeEmail(r.email);

      if (!r.fullName || (!normalizedPhone && !normalizedEmail)) {
        invalidCount++;
        errorLog.push({ row: i + 1, name: r.fullName, error: 'Missing name or contact method' });
        continue;
      }

      // Duplicate check
      const isDuplicate =
        (normalizedPhone && existingPhones.has(normalizedPhone)) ||
        (normalizedEmail && existingEmails.has(normalizedEmail));

      if (isDuplicate) {
        duplicateCount++;
        errorLog.push({ row: i + 1, name: r.fullName, error: 'Duplicate contact record skipped' });
        if (skipDuplicates) {
          continue;
        }
      }

      try {
        // Create Customer
        const customer = await this.prisma.customer.create({
          data: {
            vendorId,
            fullName: r.fullName.trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            city: r.city?.trim() || null,
            state: r.state?.trim() || null,
            gender: r.gender && ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(r.gender)
              ? (r.gender as Gender)
              : null,
            notes: r.notes?.trim() || null,
            source: CustomerSource.CSV_IMPORT,
          },
        });

        // Track newly added contacts for batch-level deduplication
        if (normalizedPhone) existingPhones.add(normalizedPhone);
        if (normalizedEmail) existingEmails.add(normalizedEmail);

        // Process tags
        if (r.tags) {
          const tagNames = r.tags
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean);

          for (const tagName of tagNames) {
            let tagId = tagMap.get(tagName.toLowerCase());
            if (!tagId) {
              const newTag = await this.prisma.customerTag.create({
                data: { vendorId, name: tagName, color: '#7B35E8' },
              });
              tagId = newTag.id;
              tagMap.set(tagName.toLowerCase(), tagId);
            }

            await this.prisma.customerTagAssignment.create({
              data: { customerId: customer.id, tagId },
            });
          }
        }

        // Initialize default consents
        for (const channel of [ConsentChannel.SMS, ConsentChannel.WHATSAPP, ConsentChannel.EMAIL]) {
          await this.prisma.customerConsent.create({
            data: {
              customerId: customer.id,
              channel,
              status: ConsentStatus.UNKNOWN,
              source: 'CSV_IMPORT',
            },
          });
        }

        successCount++;
      } catch (err: any) {
        invalidCount++;
        errorLog.push({ row: i + 1, name: r.fullName, error: err.message });
      }
    }

    // Save CustomerImport record
    const importRecord = await this.prisma.customerImport.create({
      data: {
        vendorId,
        fileName,
        totalRows: rows.length,
        successRows: successCount,
        duplicateRows: duplicateCount,
        invalidRows: invalidCount,
        status: successCount > 0 ? ImportStatus.COMPLETED : ImportStatus.FAILED,
        errorReport: errorLog,
      },
    });

    await this.auditService.log({
      userId,
      vendorId,
      action: 'CSV_IMPORT_COMPLETED',
      entityType: 'CustomerImport',
      entityId: importRecord.id,
      ipAddress: ip,
      metadata: { total: rows.length, success: successCount, duplicates: duplicateCount, invalid: invalidCount },
    });

    return {
      importId: importRecord.id,
      fileName,
      totalRows: rows.length,
      successRows: successCount,
      duplicateRows: duplicateCount,
      invalidRows: invalidCount,
      status: importRecord.status,
      errors: errorLog,
    };
  }

  async getImportDetails(vendorId: string, importId: string) {
    const record = await this.prisma.customerImport.findFirst({
      where: { id: importId, vendorId },
    });

    if (!record) {
      throw new NotFoundException('Import record not found');
    }

    return record;
  }
}

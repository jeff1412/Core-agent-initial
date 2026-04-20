'use strict';

/**
 * modules/briefValidator.ts — Task Brief Validator
 */

export const REQUIRED_FIELDS = [
  'Product',
  'Task Type',
  'Description',
  'Acceptance Criteria',
  'Priority',
  'Do Not Touch',
  'Reference Files',
];

export interface ValidationResult {
  isValid: boolean;
  parsedFields: Record<string, string>;
  missingFields: string[];
}

/**
 * validate(messageText)
 */
export function validate(messageText: string): ValidationResult {
  if (!messageText || typeof messageText !== 'string') {
    return { isValid: false, parsedFields: {}, missingFields: [...REQUIRED_FIELDS] };
  }

  const parsedFields: Record<string, string> = {};
  const missingFields: string[] = [];
  const normalizedText = messageText.replace(/\r\n/g, '\n');

  REQUIRED_FIELDS.forEach(field => {
    const fieldPattern = new RegExp(`(?:^|\\n)\\*?\\*?${field}:\\*?\\*?\\s*([\\s\\S]*?)(?=(?:\\n\\*?\\*?(?:${REQUIRED_FIELDS.join('|')}):\\*?\\*?)|$)`, 'i');
    const match = normalizedText.match(fieldPattern);
    
    if (match && match[1] && match[1].trim() !== '') {
      parsedFields[field] = match[1].trim();
    } else {
      missingFields.push(field);
    }
  });

  return {
    isValid: missingFields.length === 0,
    parsedFields,
    missingFields
  };
}

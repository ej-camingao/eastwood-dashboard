import { CONTACT_NUMBER_REGEX, EMAIL_REGEX, CONTACT_NUMBER_FORMAT, CONTACT_NUMBER_EXAMPLE } from './constants';
import type { AttendeeRegistrationData } from '$lib/types/attendance';

/**
 * Validation result interface
 */
export interface ValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Validate contact number format (Philippine format: +639xxxxxxxxx)
 */
export function validateContactNumber(contactNumber: string): ValidationResult {
	if (!contactNumber || !contactNumber.trim()) {
		return {
			isValid: false,
			error: 'Contact number is required.'
		};
	}

	if (!CONTACT_NUMBER_REGEX.test(contactNumber.trim())) {
		return {
			isValid: false,
			error: `Contact number must be in format ${CONTACT_NUMBER_FORMAT} (e.g., ${CONTACT_NUMBER_EXAMPLE})`
		};
	}

	return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined): ValidationResult {
	if (!email || !email.trim()) {
		return { isValid: true }; // Email is optional
	}

	if (!EMAIL_REGEX.test(email.trim())) {
		return {
			isValid: false,
			error: 'Please enter a valid email address.'
		};
	}

	return { isValid: true };
}

/**
 * Validate required fields for registration
 */
export function validateRequiredFields(data: AttendeeRegistrationData): ValidationResult {
	if (!data.first_name?.trim()) {
		return { isValid: false, error: 'First name is required.' };
	}
	if (!data.last_name?.trim()) {
		return { isValid: false, error: 'Last name is required.' };
	}
	if (!data.contact_number?.trim()) {
		return { isValid: false, error: 'Contact number is required.' };
	}
	if (!data.school_name?.trim()) {
		return { isValid: false, error: 'School name is required.' };
	}
	if (!data.barangay?.trim()) {
		return { isValid: false, error: 'Barangay is required.' };
	}
	if (!data.city?.trim()) {
		return { isValid: false, error: 'City is required.' };
	}
	if (!data.gender) {
		return { isValid: false, error: 'Gender is required.' };
	}

	return { isValid: true };
}

/**
 * Validate complete registration form
 */
export function validateRegistrationForm(data: AttendeeRegistrationData): ValidationResult {
	// Check required fields
	const requiredValidation = validateRequiredFields(data);
	if (!requiredValidation.isValid) {
		return requiredValidation;
	}

	// Validate contact number format
	const contactValidation = validateContactNumber(data.contact_number);
	if (!contactValidation.isValid) {
		return contactValidation;
	}

	// Validate email if provided
	const emailValidation = validateEmail(data.email);
	if (!emailValidation.isValid) {
		return emailValidation;
	}

	return { isValid: true };
}


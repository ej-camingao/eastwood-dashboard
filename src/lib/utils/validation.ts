import { EMAIL_REGEX } from './constants';
import type {
	AttendeeRegistrationData,
	B1GRegistrationData,
	ELV8RegistrationData,
	HeardAboutElevate
} from '$lib/types/attendance';

const PH_CONTACT_REGEX = /^\+639\d{9}$/;

const HEARD_ABOUT_OPTIONS: HeardAboutElevate[] = [
	'Facebook',
	'Friend',
	'Family',
	'Instagram',
	'Others'
];

/**
 * Validation result interface
 */
export interface ValidationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Validate contact number (only checks if required, no format validation)
 */
export function validateContactNumber(contactNumber: string, hasMobileNumber: boolean): ValidationResult {
	// If user indicated they don't have a mobile number, skip validation
	if (!hasMobileNumber) {
		return { isValid: true };
	}

	// If they have a mobile number, it's required
	if (!contactNumber || !contactNumber.trim()) {
		return {
			isValid: false,
			error: 'Contact number is required.'
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
	// Contact number is only required if user has a mobile number
	if (data.has_mobile_number && !data.contact_number?.trim()) {
		return { isValid: false, error: 'Contact number is required.' };
	}
	if (!data.birthday?.trim()) {
		return { isValid: false, error: 'Birthday is required.' };
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
	const heard = data.heard_about_elevate;
	if (!heard?.trim() || !HEARD_ABOUT_OPTIONS.includes(heard as HeardAboutElevate)) {
		return { isValid: false, error: 'Please select how you heard about ELEVATE.' };
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
	const contactValidation = validateContactNumber(data.contact_number, data.has_mobile_number);
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

/**
 * Validate B1G Eastwood registration form
 */
export function validateB1GRegistrationForm(data: B1GRegistrationData): ValidationResult {
	if (!data.first_name?.trim()) {
		return { isValid: false, error: 'First name is required.' };
	}
	if (!data.last_name?.trim()) {
		return { isValid: false, error: 'Last name is required.' };
	}

	const month = Number(data.birth_month);
	if (!Number.isInteger(month) || month < 1 || month > 12) {
		return { isValid: false, error: 'Please select a valid birth month.' };
	}

	const year = Number(data.birth_year);
	const currentYear = new Date().getFullYear();
	if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
		return { isValid: false, error: 'Please select a valid birth year.' };
	}

	if (!data.contact_number?.trim()) {
		return { isValid: false, error: 'Contact number is required.' };
	}
	if (!PH_CONTACT_REGEX.test(data.contact_number.trim())) {
		return {
			isValid: false,
			error: 'Contact number must be a 10-digit PH mobile number (e.g., 9123456789).'
		};
	}

	return { isValid: true };
}

/**
 * Validate ELEVATE (ELV8) registration form
 */
export function validateELV8RegistrationForm(data: ELV8RegistrationData): ValidationResult {
	if (!data.first_name?.trim()) {
		return { isValid: false, error: 'First name is required.' };
	}
	if (!data.last_name?.trim()) {
		return { isValid: false, error: 'Last name is required.' };
	}

	const month = Number(data.birth_month);
	if (!Number.isInteger(month) || month < 1 || month > 12) {
		return { isValid: false, error: 'Please select a valid birth month.' };
	}

	const year = Number(data.birth_year);
	const currentYear = new Date().getFullYear();
	if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
		return { isValid: false, error: 'Please select a valid birth year.' };
	}

	if (!data.contact_number?.trim()) {
		return { isValid: false, error: 'Contact number is required.' };
	}
	if (!PH_CONTACT_REGEX.test(data.contact_number.trim())) {
		return {
			isValid: false,
			error: 'Contact number must be a 10-digit PH mobile number (e.g., 9123456789).'
		};
	}

	return { isValid: true };
}


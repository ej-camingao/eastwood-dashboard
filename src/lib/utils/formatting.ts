// Formatting utilities

/**
 * Format contact number for display (show last 4 digits)
 */
export function formatContactNumber(contactNumber: string): string {
	if (contactNumber.length > 4) {
		return `****${contactNumber.slice(-4)}`;
	}
	return contactNumber;
}

/**
 * Get today's date in YYYY-MM-DD format for date input max
 */
export function getTodayDate(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Format check-in time for display
 */
export function formatCheckInTime(timestamp: string): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	});
}


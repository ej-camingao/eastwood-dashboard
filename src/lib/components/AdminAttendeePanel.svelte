<script lang="ts">
	import type { Attendee, ElevateAttendeeAdminPatch, Facilitator } from '$lib/types/attendance';
	import FormField from './FormField.svelte';

	interface Props {
		attendee: Attendee;
		facilitators: Facilitator[];
		leaderNames: string[];
		isSaving?: boolean;
		isDgroupMember: boolean;
		leaderName: string;
		isFirstTimer: boolean;
		facilitatorId: string;
		onDgroupMemberChange: (value: boolean) => void;
		onLeaderNameChange: (value: string) => void;
		onFirstTimerChange: (value: boolean) => void;
		onFacilitatorIdChange: (value: string) => void;
		onSave: (patch: ElevateAttendeeAdminPatch) => void;
	}

	let {
		attendee,
		facilitators,
		leaderNames,
		isSaving = false,
		isDgroupMember,
		leaderName,
		isFirstTimer,
		facilitatorId,
		onDgroupMemberChange,
		onLeaderNameChange,
		onFirstTimerChange,
		onFacilitatorIdChange,
		onSave
	}: Props = $props();

	const facilitatorKnown = $derived(facilitators.some((facilitator) => facilitator.id === facilitatorId));
	const facilitatorRequired = $derived(attendee.default_facilitator_id != null);
	const leaderOptions = $derived.by(() => {
		const current = leaderName.trim();
		const names = current && !leaderNames.includes(current) ? [...leaderNames, current] : [...leaderNames];
		return names.sort((a, b) => a.localeCompare(b));
	});
	const saveBlocked = $derived(
		isSaving || (isDgroupMember && !leaderName.trim()) || (facilitatorRequired && !facilitatorId)
	);

	function display(value: string | null | undefined): string {
		const trimmed = value?.trim();
		return trimmed ? trimmed : '—';
	}

	function formatBirthday(value: string | null): string {
		if (!value) return '—';
		const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function facilitatorLabel(facilitator: Facilitator): string {
		const name = `${facilitator.first_name} ${facilitator.last_name}`;
		return facilitator.is_facilitating ? name : `${name} (not facilitating)`;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (saveBlocked) return;
		onSave({
			is_dgroup_member: isDgroupMember,
			dgroup_leader_name: isDgroupMember ? leaderName.trim() : null,
			is_first_timer: isFirstTimer,
			default_facilitator_id: facilitatorId.trim() || null
		});
	}
</script>

<section class="glass rounded-2xl shadow-brand-lg p-8 animate-slide-in-up">
	<div class="mb-8">
		<h2 class="text-3xl font-bold text-gray-900">
			{attendee.first_name} {attendee.last_name}
		</h2>
		<div class="mt-3 w-16 h-1 bg-brand-gradient rounded-full"></div>
	</div>

	<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-8">
		<div>
			<dt class="text-sm font-semibold text-gray-500">Gender</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.gender)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">Contact</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.contact_number)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">Email</dt>
			<dd class="text-base font-medium text-gray-900 break-all">{display(attendee.email)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">Birthday</dt>
			<dd class="text-base font-medium text-gray-900">{formatBirthday(attendee.birthday)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">School</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.school_name)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">Barangay</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.barangay)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">City</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.city)}</dd>
		</div>
		<div>
			<dt class="text-sm font-semibold text-gray-500">Social media name</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.social_media_name)}</dd>
		</div>
		<div class="sm:col-span-2">
			<dt class="text-sm font-semibold text-gray-500">How they heard about Elevate</dt>
			<dd class="text-base font-medium text-gray-900">{display(attendee.heard_about_elevate)}</dd>
		</div>
	</dl>

	<form class="space-y-6 border-t border-gray-200 pt-8" onsubmit={handleSubmit}>
		<FormField id="admin-dgroup" label="DGroup member" required>
			<select
				id="admin-dgroup"
				value={isDgroupMember ? 'true' : 'false'}
				onchange={(event) => onDgroupMemberChange(event.currentTarget.value === 'true')}
				disabled={isSaving}
				class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
			>
				<option value="false">No</option>
				<option value="true">Yes</option>
			</select>
		</FormField>

		{#if isDgroupMember}
			<FormField
				id="admin-dgroup-leader"
				label="DGroup leader"
				required
				helpText="Choose a leader already on file."
			>
				<select
					id="admin-dgroup-leader"
					value={leaderName}
					onchange={(event) => onLeaderNameChange(event.currentTarget.value)}
					disabled={isSaving}
					required
					class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
				>
					<option value="" disabled>Select a leader</option>
					{#each leaderOptions as name (name)}
						<option value={name}>{name}</option>
					{/each}
				</select>
			</FormField>
		{/if}

		<FormField id="admin-first-timer" label="First-timer" required>
			<select
				id="admin-first-timer"
				value={isFirstTimer ? 'true' : 'false'}
				onchange={(event) => onFirstTimerChange(event.currentTarget.value === 'true')}
				disabled={isSaving}
				class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
			>
				<option value="false">No</option>
				<option value="true">Yes</option>
			</select>
		</FormField>

		<FormField
			id="admin-default-facilitator"
			label="Default facilitator"
			required={facilitatorRequired}
			helpText="Same gender as this attendee. Auto-assign skips a gender mismatch."
		>
			<select
				id="admin-default-facilitator"
				value={facilitatorId}
				onchange={(event) => onFacilitatorIdChange(event.currentTarget.value)}
				disabled={isSaving}
				required={facilitatorRequired}
				class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus-brand disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300 font-medium"
			>
				{#if !facilitatorRequired}
					<option value="">None</option>
				{/if}
				{#if facilitatorId && !facilitatorKnown}
					<option value={facilitatorId}>Current facilitator unavailable</option>
				{/if}
				{#each facilitators as facilitator (facilitator.id)}
					<option value={facilitator.id}>{facilitatorLabel(facilitator)}</option>
				{/each}
			</select>
		</FormField>

		<button
			type="submit"
			disabled={saveBlocked}
			class="w-full bg-brand-gradient text-white py-4 px-8 rounded-xl font-bold text-lg hover:shadow-brand-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
		>
			{isSaving ? 'Saving…' : 'Save changes'}
		</button>
	</form>
</section>

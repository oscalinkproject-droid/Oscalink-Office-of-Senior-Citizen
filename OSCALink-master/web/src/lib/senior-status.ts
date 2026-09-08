// Single source of truth for classifying senior records into the Pending
// Verification review buckets. Used by both the sidebar badge counter and the
// Pending Approvals page tabs so the badge and the visible list always agree.

export type ReviewStatus = 'pending' | 'disapproved' | 'disqualified';

// Status values that put a record in the "Pending" review bucket. These are the
// *not-yet-decided* pipeline statuses. Decided / terminal statuses (Disapproved,
// Disqualified, Active, Deceased, Transferred, Inactive, Cancelled, Archived) are
// intentionally excluded so they never count toward the pending badge.
export const PENDING_STATUSES = ['Pending', 'Pending Barangay', 'Pending OSCA', 'Pending Mayor', 'FOR_HEAD_APPROVAL'] as const;

// Classify a single record's status into a review bucket (mirrors the client tabs).
export function reviewStatusOf(status: string | null | undefined): ReviewStatus | null {
  if (status == null) {
    return 'pending';
  }
  const st = status.toLowerCase();
  if (st === 'disapproved' || st === 'rejected') return 'disapproved';
  if (st === 'disqualified') return 'disqualified';
  if (st === '' || st === 'pending' || st === 'pending barangay' || st === 'pending osca' || st === 'pending_osca' || st === 'for_head_approval') {
    return 'pending';
  }
  // Everything else (Active, Inactive, Deceased, Transferred, Cancelled, Archived)
  // is not surfaced in any review bucket.
  return null;
}

// Whether a record belongs in the "Pending" review bucket.
export function isPendingReview(status: string | null | undefined): boolean {
  return reviewStatusOf(status) === 'pending';
}

# OSCALink Integration Plan: Senior Citizen Services and Procedures

*Line Spacing: 1.15*

## Registration and Verification Flow
1. **Barangay Clearance:** Senior citizens must first request assistance from their respective barangay before proceeding to the Office of Senior Citizens Affairs (OSCA).
   - *System Feature:* Create a "Barangay Clearance/Endorsement" module where Barangay accounts can approve and forward applicants.
2. **Residency Verification:** OSCA requires this process to confirm if the applicant is a resident of Cotabato City, as they only cater to city residents.
   - *System Feature:* Add a hard verification step confirming Cotabato City address.
3. **Required Documentation:** The primary requirement identified by the barangay for senior citizens is a valid ID.
   - *System Feature:* Ensure ID upload is a mandatory prerequisite in the registration flow.
4. **OSCA Registration:** After the barangay transaction, the senior citizen proceeds to OSCA for official registration.
   - *System Feature:* Multi-step approval pipeline (`Pending Barangay` -> `Pending OSCA` -> `Active`).

## Social Pension Application
1. **Prerequisite:** A senior citizen cannot apply for a social pension without passing through the OSCA office first.
   - *System Feature:* Pension application buttons are locked/hidden until the senior's status is `Active` / `OSCA Registered`.
2. **Approval Authority:** The City Social Welfare and Development Office (CSWDO/MSWDO) or the OSCA Head serves as the main office for approving pension applications.
   - *System Feature:* Implement strict RBAC where only `osca_head` and `mswd_officer` can trigger the 'Approve' action on pension requests.
3. **Verification of Status:** The pension is specifically for seniors who are "regular workers" (e.g., tricycle drivers) and do not have existing benefits from other agencies.
   - *System Feature:* Add database flags (`has_other_pension`, `employment_history`) to auto-filter and flag ineligible applicants.
4. **Submission of Lists:** The barangay is responsible for providing the list of names of senior citizens who are eligible to apply for the social pension to the MSWDO or OSCA.
   - *System Feature:* Allow Barangay user roles to generate and submit batch endorsements to higher offices.

## ID Issuance and Benefits
1. **Mandatory Signatures:** A Senior Citizen ID is considered invalid without the signatures of both the OSCA Head and the City Mayor.
   - *System Feature:* Digitally generate the ID with authorized E-signatures automatically appended upon final approval.
2. **Accompanying Booklet:** Upon receiving the ID, seniors are also issued a booklet to be used for discounts at groceries and pharmacies.
   - *System Feature:* Create a digital ledger/booklet module for tracking discount limits and usage.
3. **System Integration:** The developers discussed adding these ID samples and application forms into a digital system to streamline the verification process.
   - *System Feature:* Build a document template repository and a digital form builder to replace paper forms.

## Administrative Oversight
1. **Reporting:** OSCA submits monthly, quarterly, and yearly accomplishment reports to the Planning Officer at the CSWDO, which are then reviewed by the Mayor.
   - *System Feature:* Automated reporting engine to aggregate registration, pension, and request data into standardized, exportable reports.
2. **Mayor’s Role:** The Mayor monitors OSCA activities through these consolidated reports and must approve any new programs or organized group activities for senior citizens.
   - *System Feature:* Create a specialized Executive Dashboard for the `mayor` role to view analytics and approve proposed programs.
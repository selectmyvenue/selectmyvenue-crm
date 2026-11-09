const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"dashboard.html"),"utf8"),js=fs.readFileSync(path.join(root,"smv-live-operations.js"),"utf8"),css=fs.readFileSync(path.join(root,"smv-live-operations.css"),"utf8");
assert.match(html,/smv-live-operations\.js/);assert.match(html,/smv-live-operations\.css/);assert.match(js,/document\.body\.appendChild\(section\)/);
for(const t of ["customer_enquiries","venues","venue_enquiry_assignments"])assert.ok(js.includes('from("'+t+'")'));
assert.match(js,/postgres_changes/);assert.match(js,/SMVLiveOperations/);
assert.doesNotMatch(js,/\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/);
assert.doesNotMatch(css,/\.crm-main|#leadManagementSection|#leadsTableBody/);
console.log("SMV Live Operations safety contracts passed.");
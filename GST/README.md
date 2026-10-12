# GST Portal Taxpayer Search & Return Filing Automation

Is project me GST Portal (`https://services.gst.gov.in/services/searchtp`) ka complete end-to-end automation setup hai:

1. Portal open karta hai.
2. Taxpayer GSTIN input karta hai (`19MAJPS4713H1Z3`).
3. Captcha detect karke audio aur image extract karta hai.
4. Captcha enter karke Search execute karta hai.
5. **Search Result based on GSTIN/UIN** ke andar ke sabhi taxpayer details copy/extract karta hai.
6. **Show Filing Table** button click karta hai.
7. Financial Year **2026-2027** select karke Search press karta hai.
8. Niche aane wali **GSTR-3B** aur **GSTR-1/IFF** filing table ka complete data copy karta hai.
9. Data ko `taxpayer_details.json` aur `filing_table.json` me save karta hai aur screenshot `final_result.png` generate karta hai.

---

## Files

- [run_gst_automation.js](file:///d:/projects/GST/run_gst_automation.js) - Main automation script
- [taxpayer_details.json](file:///d:/projects/GST/taxpayer_details.json) - Extracted Taxpayer details (JSON)
- [filing_table.json](file:///d:/projects/GST/filing_table.json) - Extracted Filing tables (JSON)
- [final_result.png](file:///d:/projects/GST/final_result.png) - Result screenshot from GST portal

---

## How to Run

Terminal me run karein:
```powershell
node run_gst_automation.js
```
Script captcha generate karega (`captcha.png` aur `captcha.mp3`). Captcha code ko `captcha_code.txt` me likhte hi script baaki saara process automatically complete kar dega.

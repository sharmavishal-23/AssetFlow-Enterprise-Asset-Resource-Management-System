# AssetFlow Walkthrough & Verification Guide

AssetFlow is a production-ready, full-stack enterprise Asset & Resource Management ERP system built on Next.js 16 (App Router), Vanilla CSS, and a zero-dependency JSON-based transactional database file store.

## Verification Checklist

The application compiled with **zero errors and warnings** and is ready for local deployment. Below are the steps to verify the operational logic.

### 1. Launch the Application Locally
To start the Next.js development server:
1. Run the following command in your terminal:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:3000`.

---

### 2. Sandbox Demo Credentials
You can log in under any of the pre-seeded corporate accounts:
- 👨‍💻 **System Administrator**: `admin@assetflow.com` / `admin123`
- 💼 **Asset Manager**: `manager@assetflow.com` / `manager123`
- 👔 **Department Head**: `head@assetflow.com` / `head123`
- 👤 **Employee**: `employee@assetflow.com` / `employee123`

---

## Operations Walkthrough

### Part A: Signup & Strict Role Promotion (Security Check)
1. Navigate to `/signup` and register a new account (e.g., `newguy@company.com`).
2. Log in as your new user. Note that you are initialized as an **Employee**.
3. Attempt to access `/organization` (Organization Setup) or `/audits` in the URL bar. The request proxy (`src/proxy.js`) will immediately catch the request and redirect you back to `/dashboard` because employees do not have authorization.
4. Log out and sign in as `admin@assetflow.com` (System Admin).
5. Navigate to the **Organization Setup** page and click the **Employee Directory** tab.
6. Click **Adjust Permissions** next to your new user, change their role to **Asset Manager**, and click **Save**.
7. Log out, log back in as your new user, and verify that the sidebar now displays the administrative options like **Maintenance** and **Audit Cycles**.

---

### Part B: Custom Categories & Dynamic Specifications
1. Log in as an **Asset Manager** or **Admin**.
2. Go to **Organization Setup** -> **Asset Categories** tab.
3. Add a category:
   - **Name**: `Smartphones`
   - **Code**: `IT-PHN`
   - **Custom Fields**: Click **Add Field** to add attributes like `IMEI Number` (Text, Required) and `OS Version` (Text). Save the category template.
4. Go to **Assets Inventory** and click **Register Asset**.
5. Select the `Smartphones` category. Notice that input fields for `IMEI Number` and `OS Version` render dynamically.
6. Input asset details (e.g., `iPhone 16 Pro`) and fill out the custom specifications. Click **Add Asset**.
7. The asset will be saved in the database under tag `AST-0005` (with a dynamically generated pseudo-random vector SVG QR Code on-screen).

---

### Part C: Double-Booking Overlap Prevention
1. Go to **Bookings Calendar**.
2. Click **Book Resource** and reserve `MacBook Pro 16" M3 Max` (`AST-0001`) on:
   - **Date**: July 15, 2026
   - **Time**: 09:00 AM to 11:00 AM
   - Click **Confirm**. The event block will appear inside the calendar month grid.
3. Click **Book Resource** again and try booking the same `MacBook Pro 16" M3 Max` for an overlapping range (e.g. `July 15, 2026, 10:00 AM to 12:00 PM`).
4. Submit the form. The system will block the request and raise a `409 Double-Booking Conflict` alert indicating the resource is occupied.
5. In the sidebar list, click on your active booking to cancel or reschedule it.

---

### Part D: Maintenance Pipelines & State Transitions
1. Log in as an **Asset Manager** or **Admin** and navigate to the **Maintenance** page.
2. Under **Outstanding Service Requests**, you will see the Conference Room Display `AST-0004` which was flagged for backlight repairs.
3. Click **⚙ Start Servicing**. The record moves to the **In-Progress Repair Pipeline** and the asset's state is updated from `Under Maintenance` to `Under Maintenance` (visible on the Assets page).
4. When work completes, click **✓ Finish & Check-In**. The repair log moves to the **Completed Service Ledger**, the cost is logged, and the asset's state transitions back to `Available`.

---

### Part E: Audit Locking & Missing Asset Verification
1. Navigate to the **Audit Cycles** page.
2. Select the `Q3 IT Equipment Inventory Audit` cycle.
3. Under the discrepancy checklist:
   - Check off asset `AST-0001` as **Verify** (Verified).
   - Check off asset `AST-0002` (Dell XPS 15) as **Missing**.
   - Check off asset `AST-0003` as **Damaged**.
4. Click **Lock Cycle & Apply** and confirm.
5. The audit status changes to **Locked**, and the form blocks any future edits (Strict Lock).
6. Go back to the **Assets Inventory** page:
   - Notice that `AST-0002` status has automatically updated to **Lost**.
   - Notice that `AST-0003` status has automatically changed to **Under Maintenance** and a repair work order has been added to the Maintenance queue.

---

### Part F: Reports & CSV Export Data Sheets
1. Go to the **Reports & Logs** page.
2. Check the canvas-drawn **Asset Lifecycle State Breakdown** doughnut chart and the **Department Inventory Utilization** bar chart.
3. Look at the **Booking Resource Heatmap** to see peak booking hours.
4. Click **Export Complete Inventory (CSV)** at the top. The browser will download a spreadsheet (`assetflow_report.csv`) populated with data matching your database catalog.
5. Admin users can review the **System Security & Audit Activity Trail** table below to see a detailed audit trail of user actions.

# 🛒 Smart QR-Based Supermarket Web Application

[![Framework: React](https://img.shields.io/badge/Framework-React.js-blue)](https://reactjs.org/)
[![Bundler: Vite](https://img.shields.io/badge/Bundler-Vite-646CFF)](https://vitejs.dev/)
[![Database: Firebase](https://img.shields.io/badge/Database-Firebase-FFCA28?logo=firebase)](https://firebase.google.com/)

An innovative, high-performance **Progressive Web App (PWA)** designed to eliminate checkout queues and digitize the brick-and-mortar shopping experience.



<div align="center">
<img width="1536" height="1024" alt="A family shopping in" src="https://github.com/user-attachments/assets/8cb9930b-a7af-474a-a031-b8288cd0acb6" />
</div>






---

## 🌟 Project Overview
The **Smart QR-Based Supermarket Web App** transforms a user’s smartphone into a personal billing terminal. By scanning a unique QR code on a trolley, shoppers can add items to a digital cart in real-time, receive AI-driven offer recommendations, and navigate the store effortlessly.

### ✅ Key Features
* **📱 QR-Linked Sessions:** Scan a trolley QR to instantly sync your mobile device.
* **🔍 Integrated Scanning:** High-speed product recognition using the mobile camera.
* **💰 Smart Deals Engine:** Automated prompts for combo offers and bulk discounts.
* **📦 Firebase Real-time Sync:** Instant inventory updates and secure user authentication.

---

## 🛠️ Technical Stack
- **Frontend:** React.js with TypeScript
- **Build Tool:** Vite
- **Backend/Database:** Firebase (Firestore & Auth)
- **Styling:** CSS3

---

## 📂 Project Structure
Based on the current repository layout:
```text
├── src/
│   ├── components/       # Reusable UI components
│   ├── App.tsx           # Main Application component
│   ├── firebase.ts       # Firebase configuration & initialization
│   ├── main.tsx          # Application entry point
│   ├── seed.ts           # Script for seeding initial product data
│   ├── types.ts          # TypeScript interfaces and types
│   └── index.css         # Global styles
├── firebase-blueprint.json # Firebase project structure
├── firestore.rules       # Security rules for Firestore
├── index.html            # HTML template
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite bundler configuration
```


## ⚙️ Installation & Setup

Follow these steps to get the development environment running on your local machine:

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/your-username/smart-supermarket.git](https://github.com/your-username/smart-supermarket.git)
   cd smart-supermarket

2. **Install Dependencies**
   ```bash
   Use npm to install the required packages defined in package.json:
   npm install

3. **Environment Configuration**
   ```bash
   Create a .env file in the root directory (referencing .env.example) and add your Firebase credentials:

   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

4. **Database Seeding**

   ```bash
   To populate your Firestore with an initial set of supermarket products, run the seeding script:
   npm run seed

5. **Start Development Server**
   ```bash
   Launch the application using Vite:
   npm run dev
   
### 🔮 Future Roadmap
   The current PWA provides a robust foundation, but we aim to evolve into a fully autonomous retail ecosystem:

* ⚖️ Hardware-Level Anti-Theft: Integration of Load Cells (Weight Sensors) under trolley baskets to cross-verify physical weight with digital cart data.
* 📍 BLE Beacon Navigation: Utilizing Bluetooth Low Energy beacons to provide "Blue Dot" indoor pathfinding and heat-map analytics.
* 💳 Integrated FinTech: Full payment gateway integration (UPI/Credit Cards) to generate a dynamic "Exit Pass" QR code for automated gate release.
* 🤖 Computer Vision (YOLOv10): Moving beyond barcodes to real-time object detection, identifying products instantly by their shape and packaging.
* 🛒 Automated "Follow-Me" Trolleys: Motorized trolley mechanisms that follow a user’s smartphone signal for a hands-free experience.

### 🤝 Contributing
   We welcome contributions to make "Intelligent Retail" more accessible and efficient!

* Fork the Project. Create your Feature Branch 🤌.
```bash 
git checkout -b feature/AmazingFeature
Commit your Changes (git commit -m 'Add some AmazingFeature').
Push to the Branch (git push origin feature/AmazingFeature).
Open a Pull Request for review.

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

2.

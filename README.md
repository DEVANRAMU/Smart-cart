<div align="center">
<img width="1536" height="1024" alt="A family shopping in" src="https://github.com/user-attachments/assets/8cb9930b-a7af-474a-a031-b8288cd0acb6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.




## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`



   🛒 Smart QR-Based Supermarket Web ApplicationAn innovative, high-performance Progressive Web App (PWA) designed to eliminate checkout queues and digitize the brick-and-mortar shopping experience.🌟 OverviewThe Smart QR-Based Supermarket Web App transforms a user’s smartphone into a personal billing terminal. By scanning a unique QR code on a trolley, shoppers can add items to a digital cart in real-time, receive AI-driven offer recommendations, and navigate the store effortlessly.🚀 Key Features📱 QR-Linked Sessions: Scan a trolley QR to instantly sync your mobile device with your physical cart.🔍 QuaggaJS Integration: High-speed barcode and product recognition using the mobile camera.💰 Smart Deals Engine: Automated prompts for combo offers and bulk discounts during the scanning process.🗺️ Indoor Navigation: Search-to-aisle functionality to help users find products quickly.👨‍👩‍👧 Multi-Trolley Sync: Synchronize multiple baskets under one account for a single consolidated family bill.📦 Real-Time Inventory: Instant database updates ($Stock = Stock - 1$) upon cart confirmation to ensure accuracy.🛠️ Technical StackComponentTechnologyFrontendReact.js / PWA (Progressive Web App)BackendNode.js / Express.jsDatabaseMongoDB / Firebase (Real-time sync)ScanningQuaggaJS / Web Media Devices APIAuthenticationJWT / OTP-based Mobile Auth📂 Project StructurePlaintext├── public/          # Static assets & Manifest for PWA
├── src/
│   ├── components/  # Reusable UI (Cart, Scanner, Map)
│   ├── context/     # State management for Multi-Trolley Sync
│   ├── hooks/       # Custom hooks for Camera & Location
│   └── services/    # API calls & Inventory logic
├── server/          # Backend logic & Database schemas
└── README.md
⚙️ Installation & SetupClone the RepositoryBashgit clone https://github.com/your-username/smart-supermarket-pwa.git
cd smart-supermarket-pwa
Install DependenciesBash# Install for Frontend
npm install
# Install for Backend
cd server && npm install
Environment ConfigurationCreate a .env file in the root and server folders:Code snippetPORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
Run the ApplicationBash# From the root directory
npm run dev
🔮 Future Roadmap⚖️ Weight Sensors: Load cell integration in trolleys to prevent theft.📍 BLE Beacons: Precise "Blue Dot" indoor pathfinding.💳 FinTech Integration: In-app UPI and Credit Card payments for automated gate exits.🤖 AI Vision: Upgrading to YOLOv10 for instant object recognition without barcodes.🤝 ContributingContributions are what make the open-source community an amazing place to learn and create.Fork the Project.Create your Feature Branch (git checkout -b feature/AmazingFeature).Commit your Changes (git commit -m 'Add some AmazingFeature').Push to the Branch (git push origin feature/AmazingFeature).Open a Pull Request.

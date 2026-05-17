# Firebase Functions status

This folder contains the Firebase callable `generateMealPlan` implementation from the earlier Blaze-compatible architecture pass.

The active Spark-friendly architecture does not deploy Firebase Functions. Firebase stays responsible for Hosting, Auth, Firestore, Storage, and rules. AI meal generation now runs through the Vercel serverless endpoint at `api/generateMealPlan.js`, where the OpenRouter key is stored in Vercel environment variables.

`firebase.json` intentionally does not include a `functions` deploy target. Keep this folder as reference code unless the project upgrades to Blaze and intentionally moves meal generation back into Firebase Functions.

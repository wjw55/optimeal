# Optimeal

AI-assisted meal planning for goals, diet preferences, nutrition, and weekly groceries.

Live app: https://optimeal-bbabb.web.app/

## Screenshots

TODO after deployment:

- Landing page
- Demo dashboard
- Meal generation flow
- Grocery list
- Community recipes

Suggested paths:

- `docs/screenshots/landing.png`
- `docs/screenshots/demo-dashboard.png`
- `docs/screenshots/grocery-list.png`
- `docs/screenshots/community-recipes.png`

Screenshots should be captured from the deployed app after the v2 polish deployment.

## Problem

Planning meals is not just picking recipes. A useful planner needs to connect dietary preferences, nutrition targets, recipe ideas, and the grocery list people actually shop from. Optimeal brings those pieces into one Firebase-backed React app.

## Features

- Product landing page with a low-friction `Try Demo` path.
- Read-only demo dashboard with sample meal plan, nutrition summary, grocery categories, recipe preview, and profile/preferences summary.
- Authenticated dashboard for private profile, goals, meal plans, nutrition, and grocery data.
- Meal-planning profile fields for diet type, allergies, foods to avoid, cuisines, cooking skill, cooking time, budget, meals per day, servings, appliances, target calories, and target protein.
- Structured grocery items with category, quantity, unit, checked state, source day, and source meal.
- Recipe sharing, recipe explore search/filter, saved internal recipes, and external saved links.
- Community posts with per-post comments, likes, and optional image upload.
- Firestore and Storage security rules scoped to user ownership and author-owned community content.

## Tech Stack

- React 19 with Create React App
- React Router
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting
- Vercel Serverless Functions for AI generation
- OpenRouter API
- Zod validation
- npm

## Architecture

```text
React client
  -> Firebase Auth
  -> Firestore user documents, recipes, community posts
  -> Firebase Storage for community images
  -> Vercel /api/generateMealPlan for AI meal generation
  -> Firebase Hosting build output at optimeal/build
```

Optimeal stays compatible with the Firebase Spark plan:

```text
React client
  -> Firebase Auth ID token
  -> Vercel serverless function at /api/generateMealPlan
  -> OpenRouter server-side request
  -> Zod profile and meal-plan validation
  -> validated plan returned to React
  -> React saves users/{uid}.currentMeals through Firestore rules
```

Direct AI provider keys are not used in the React app. The OpenRouter key belongs only in Vercel environment variables.

## Demo Mode

Open `/demo` or click `Try Demo` on the landing page. Demo mode uses local sample data only:

- no Firebase login required
- no Firestore writes
- clearly labeled demo data
- weekly meal plan, nutrition, grocery categories, saved recipe preview, and profile/preferences summary

## Local Setup

```bash
git clone https://github.com/wjw55/optimeal.git
cd optimeal/optimeal
npm install
cp .env.example .env
npm start
```

For a production build:

```bash
cd ../optimeal
npm run build
```

Install the Vercel API dependencies from the repository root:

```bash
cd ..
npm install
```

## Environment Variables

See `optimeal/.env.example` for client Firebase settings.

Firebase web config can be public in a client app, but each deployed project should use its own Firebase project values and rely on Firebase rules for access control.

Client variable required by the React app:

```env
REACT_APP_MEAL_PLAN_ENDPOINT=https://your-vercel-app.vercel.app/api/generateMealPlan
```

Required Vercel environment variables:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
ALLOWED_ORIGINS=https://optimeal-bbabb.web.app,https://optimeal-bbabb.firebaseapp.com
```

For local development, include the frontend origin too:

```env
ALLOWED_ORIGINS=http://localhost:3000
```

Preferred Firebase Admin credential for Vercel:

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
```

Alternative split Firebase Admin credentials:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

If using `FIREBASE_PRIVATE_KEY`, keep escaped newline sequences in the environment value. The endpoint converts `\\n` to real newlines at runtime.

Do not put OpenRouter, DeepSeek, or OpenAI API keys in React `.env` files.

## AI Backend Setup

Firebase remains on Spark for:

- Hosting
- Authentication
- Firestore
- Storage

Vercel handles:

- `api/generateMealPlan.js`
- OpenRouter secret storage
- Firebase ID token verification with Firebase Admin
- Server-side profile validation
- Server-side AI JSON validation
- Optional Firestore-backed daily generation limit

The endpoint accepts only authenticated POST requests. The React client sends:

```js
Authorization: Bearer <firebase_id_token>
```

Demo mode does not call the AI endpoint and continues to use local sample data.

## Local AI Testing

1. Install frontend dependencies:

   ```bash
   cd optimeal
   npm install
   ```

2. Install root API dependencies:

   ```bash
   cd ..
   npm install
   ```

3. Create local env files:

   - `optimeal/.env` with Firebase web config and `REACT_APP_MEAL_PLAN_ENDPOINT=http://localhost:3001/api/generateMealPlan`
   - Vercel local env values for `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ALLOWED_ORIGINS`, and Firebase Admin credentials

4. Run the Vercel endpoint locally from the repository root. Port `3001` avoids the Create React App dev server on `3000`:

   ```bash
   npx vercel dev --listen 3001
   ```

5. Run the React app from `optimeal/` in another terminal:

   ```bash
   npm start
   ```

6. Sign in before generating a meal plan. Demo mode works without signing in.

## Firebase

Firebase hosting is configured at the repository root:

```bash
firebase deploy --only hosting,firestore:rules,storage
```

To deploy only hosting after rebuilding the React app:

```bash
npm --prefix optimeal run build
firebase deploy --only hosting
```

`firebase.json` intentionally does not deploy Firebase Functions so the project can stay on Spark.

## Vercel Deployment

1. Connect the GitHub repo to Vercel.
2. Use the repository root as the Vercel project root so `api/generateMealPlan.js` is deployed.
3. Add the Vercel environment variables listed above.
4. Deploy the Vercel project.
5. Copy the deployed endpoint URL, for example `https://your-vercel-app.vercel.app/api/generateMealPlan`.
6. Add that URL to the React/Firebase Hosting environment as `REACT_APP_MEAL_PLAN_ENDPOINT`.
7. Rebuild and redeploy Firebase Hosting.

If Vercel tries to build the React app unintentionally, keep the Vercel project focused on the repository root API function and leave Firebase Hosting responsible for the `optimeal/build` frontend.

## Security Notes

- Users can only read and write their own private user document.
- Recipes are readable by authenticated users, but only the author can create, update, or delete their recipes.
- Community posts are author-owned; non-authors may only update the `likes` array.
- Comments are author-owned, with post authors allowed to remove comments when deleting their own post.
- Community image uploads are limited to authenticated users writing under their own `forumImages/{uid}` path.
- `.env` files are ignored by git.
- The Vercel `generateMealPlan` endpoint verifies Firebase ID tokens before calling OpenRouter.
- The OpenRouter API key is never stored in React.
- AI output is validated with Zod before it is returned to the frontend.
- The endpoint uses Firebase Admin only for token verification, profile lookup, and rate limiting. Admin SDK writes bypass rules, so the endpoint does not save meal plans directly.

## Grocery Migration

The app can read old grocery string arrays and new structured grocery item objects. A one-time migration script is available for converting existing Firestore data.

Dry run:

```bash
cd functions
node scripts/migrateGroceryItems.js --dry-run
```

Apply:

```bash
cd functions
node scripts/migrateGroceryItems.js --apply
```

Back up Firestore before running with `--apply`. The script uses Firebase Admin application default credentials, updates only `users/{uid}.currentMeals.groceries`, and does not delete user documents.

## Planned Improvements

- Add meal swap and regenerate-day actions once backend generation is available.
- Add screenshot assets to this README after deployment.
- Add more focused component tests for demo mode, grocery normalization, and recipe filters.
- Optionally strengthen production rate limiting and monitoring around the Vercel endpoint.

## Suggested Repo Topics

`react`, `firebase`, `firestore`, `meal-planner`, `ai`, `nutrition`, `grocery-list`, `portfolio-project`

## Authors

- Wang Jiawei
- Neal Ng Seng Yew

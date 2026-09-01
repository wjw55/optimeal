const approvalPhrase = 'DEPLOY_REVIEWED_CURRENT_BUNDLE';

if (process.env.OPTIMEAL_FIREBASE_DEPLOY_APPROVED !== approvalPhrase) {
  console.error([
    '',
    'Firebase deployment blocked by the Optimeal safety guard.',
    'Before deploying, compare this branch with the currently deployed bundle, review the generated build, and obtain explicit approval.',
    `Then set OPTIMEAL_FIREBASE_DEPLOY_APPROVED=${approvalPhrase} for that deployment command only.`,
    ''
  ].join('\n'));
  process.exit(1);
}

console.log('Optimeal deployment guard acknowledged. Continuing with the reviewed deployment.');

import { getXpRequiredForLevel, getLevelFromXp, getLevelProgress } from './src/core/utils/levelUtils';

console.log('--- TEST XP REQUIRED FOR LEVEL ---');
console.log('Level 1 XP req:', getXpRequiredForLevel(1));
console.log('Level 2 XP req:', getXpRequiredForLevel(2));
console.log('Level 3 XP req:', getXpRequiredForLevel(3));
console.log('Level 4 XP req:', getXpRequiredForLevel(4));
console.log('Level 5 XP req:', getXpRequiredForLevel(5));
console.log('Level 10 XP req:', getXpRequiredForLevel(10));
console.log('Level 50 XP req:', getXpRequiredForLevel(50));

console.log('\n--- TEST LEVEL FROM XP ---');
console.log('Level for 0 XP:', getLevelFromXp(0));
console.log('Level for 1000 XP:', getLevelFromXp(1000));
console.log('Level for 2500 XP:', getLevelFromXp(2500));
console.log('Level for 4500 XP:', getLevelFromXp(4500));
console.log('Level for 7000 XP:', getLevelFromXp(7000));
console.log('Level for 49000 XP (Old lvl 50):', getLevelFromXp(49000));
console.log('Level for 615000 XP:', getLevelFromXp(615000));

console.log('\n--- TEST LEVEL PROGRESS ---');
console.log('Progress 0:', getLevelProgress(0));
console.log('Progress 500:', getLevelProgress(500));
console.log('Progress 1000:', getLevelProgress(1000));
console.log('Progress 1500:', getLevelProgress(1500));
console.log('Progress 2000:', getLevelProgress(2000));
console.log('Progress 2500:', getLevelProgress(2500));

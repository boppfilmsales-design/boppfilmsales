import fs from 'fs';
const root = 'C:/Users/DELL/projects/boppfilmsales';

// Check sitemap
console.log('=== sitemap.ts ===');
console.log(fs.readFileSync(root + '/src/app/sitemap.ts', 'utf8').substring(0, 2000));

// Check robots.ts
console.log('\n=== robots.ts ===');
console.log(fs.readFileSync(root + '/src/app/robots.ts', 'utf8'));

// Check ContactPageContent for phone number issue
console.log('\n=== ContactPageContent.tsx (phone section) ===');
const contact = fs.readFileSync(root + '/src/components/pages/ContactPageContent.tsx', 'utf8');
const phoneIdx = contact.indexOf('phone');
if (phoneIdx >= 0) console.log(contact.substring(Math.max(0,phoneIdx-200), phoneIdx+500));
else console.log('phone not found, searching for Mobile...');

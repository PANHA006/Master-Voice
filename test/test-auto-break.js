/**
 * Unit Test for formatPunctuationAutoBreak (Bilingual English . and Khmer ។)
 */
const fs = require('fs');
const path = require('path');

// Extract function from utils.js
const utilsCode = fs.readFileSync(path.join(__dirname, '../public/js/utils.js'), 'utf8');
const vm = require('vm');
const context = {};
vm.createContext(context);
vm.runInContext(utilsCode, context);

const formatPunctuationAutoBreak = context.formatPunctuationAutoBreak;

console.log('===========================================================');
console.log('🧪 TESTING SMART BILINGUAL AUTO BREAK (Khmer ។ / English .)');
console.log('===========================================================\n');

let pass = 0;
let total = 0;

function assert(description, actual, expected) {
    total++;
    const isMatch = actual === expected;
    if (isMatch) {
        pass++;
        console.log(`✅ [PASS] ${description}`);
    } else {
        console.log(`❌ [FAIL] ${description}`);
        console.log('--- ACTUAL ---:\n' + actual);
        console.log('--- EXPECTED ---:\n' + expected);
    }
}

// Test 1: User's sample English text
const userText = `# The Importance of Education

Education is one of the most important things in our lives. It helps us gain knowledge, develop skills, and understand the world around us. Education is not only about going to school and passing exams. It is also about learning how to think, solve problems, communicate with others, and make good decisions.`;

const userExpected = `# The Importance of Education

Education is one of the most important things in our lives.
It helps us gain knowledge, develop skills, and understand the world around us.
Education is not only about going to school and passing exams.
It is also about learning how to think, solve problems, communicate with others, and make good decisions.`;

assert('1. English multi-sentence paragraph auto break', formatPunctuationAutoBreak(userText), userExpected);

// Test 2: Abbreviations & Decimals protection
const abbrText = `Hello Mr. Smith and Dr. John. The price is $19.99 per item (e.g. books, pens, etc.). Please visit voxsync.ai today.`;
const abbrExpected = `Hello Mr. Smith and Dr. John.
The price is $19.99 per item (e.g. books, pens, etc.).
Please visit voxsync.ai today.`;

assert('2. English abbreviations, decimals, and URLs protection', formatPunctuationAutoBreak(abbrText), abbrExpected);

// Test 3: Khmer text with ។ and ។ល។
const khText = `នេះជាប្រយោគទីមួយ។ នេះជាប្រយោគទីពីរ។ មានសម្ភារៈជាច្រើនដូចជាសៀវភៅ ប៊ិច ខ្មៅដៃ។ល។ សម្រាប់សិស្ស។`;
const khExpected = `នេះជាប្រយោគទីមួយ។
នេះជាប្រយោគទីពីរ។
មានសម្ភារៈជាច្រើនដូចជាសៀវភៅ ប៊ិច ខ្មៅដៃ។ល។
សម្រាប់សិស្ស។`;

assert('3. Khmer sentence break with ។ and ។ល។ protection', formatPunctuationAutoBreak(khText), khExpected);

// Test 4: Questions & Exclamations
const qText = `Are you ready? Yes, let's start! This is amazing.`;
const qExpected = `Are you ready?
Yes, let's start!
This is amazing.`;

assert('4. Questions (?) and Exclamations (!)', formatPunctuationAutoBreak(qText), qExpected);

// Test 5: Numbered bullets list
const listText = `Here is the list:
1. First topic is science. We love it.
2. Second topic is history.`;

const listExpected = `Here is the list:
1. First topic is science.
We love it.
2. Second topic is history.`;

assert('5. Numbered bullets list protection (1. , 2. )', formatPunctuationAutoBreak(listText), listExpected);

console.log('\n===========================================================');
console.log(`📊 RESULT: ${pass}/${total} TEST CASES PASSED (${Math.round((pass/total)*100)}%)`);
console.log('===========================================================');

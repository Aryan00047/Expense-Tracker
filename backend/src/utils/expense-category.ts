const GENERIC_CATEGORY_VALUES = new Set([
  '',
  'na',
  'n/a',
  'null',
  'uncategorized',
  'uncategorised',
  'others',
  'other',
  'misc',
  'miscellaneous',
]);

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Loan / EMI',
    keywords: ['emi', 'loan', 'finance', 'finzoom', 'bajaj finserv', 'lending'],
  },
  {
    category: 'Credit Card Payment',
    keywords: ['credit card', 'supercard', 'card payment', 'card settle'],
  },
  {
    category: 'Bills & Utilities',
    keywords: [
      'electricity',
      'water bill',
      'broadband',
      'wifi',
      'internet',
      'recharge',
      'postpaid',
      'prepaid',
      'dth',
      'gas bill',
      'utility',
      'airtel',
      'jio',
      'vodafone',
      'bsnl',
    ],
  },
  {
    category: 'Groceries',
    keywords: [
      'grocery',
      'grocers',
      'supermarket',
      'mart',
      'bigbasket',
      'blinkit',
      'zepto',
      'instamart',
      'dmart',
      'reliance fresh',
      'milk',
      'vegetable',
    ],
  },
  {
    category: 'Dining',
    keywords: [
      'zomato',
      'swiggy',
      'restaurant',
      'cafe',
      'pizza',
      'burger',
      'biryani',
      'bakery',
      'food',
      'eatery',
    ],
  },
  {
    category: 'Transport',
    keywords: [
      'uber',
      'ola',
      'rapido',
      'metro',
      'irctc',
      'railway',
      'bus',
      'cab',
      'parking',
      'toll',
      'petrol pump',
      'fuel',
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'meesho',
      'nykaa',
      'store',
      'retail',
      'mall',
      'fashion',
    ],
  },
  {
    category: 'Healthcare',
    keywords: [
      'hospital',
      'clinic',
      'pharmacy',
      'medical',
      'medicine',
      'apollo',
      'chemist',
      'lab',
      'diagnostic',
    ],
  },
  {
    category: 'Education',
    keywords: [
      'school',
      'college',
      'course',
      'tuition',
      'udemy',
      'coursera',
      'exam',
      'training',
      'book',
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix',
      'spotify',
      'youtube',
      'prime video',
      'hotstar',
      'movie',
      'games',
      'playstation',
      'steam',
      'subscription',
    ],
  },
  {
    category: 'Cash Withdrawal',
    keywords: ['atm', 'cash withdrawal', 'cash wd', 'self withdrawal'],
  },
  {
    category: 'Transfers',
    keywords: ['upi', 'neft', 'imps', 'rtgs', 'bank transfer', 'fund transfer'],
  },
  {
    category: 'Fees & Charges',
    keywords: ['charge', 'charges', 'penalty', 'gst', 'fee', 'commission'],
  },
];

export function inferExpenseCategory(input: {
  category?: string;
  description?: string;
  merchant?: string;
}): string {
  const existingCategory = (input.category || '').trim();
  const normalizedCategory = existingCategory.toLowerCase();

  if (existingCategory && !GENERIC_CATEGORY_VALUES.has(normalizedCategory)) {
    return existingCategory;
  }

  const haystack = `${input.merchant || ''} ${input.description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9@/&\s.-]+/g, ' ');

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.category;
    }
  }

  return 'General Spending';
}

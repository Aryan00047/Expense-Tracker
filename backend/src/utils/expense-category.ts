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
  'general',
]);

/**
 * How a rupee actually behaves once it leaves the account.
 *
 * A credit-card bill and a grocery run are both debits, but only one of them is
 * consumption — lumping them together makes "you spent X on Y" nonsense, and
 * double counts the card purchases that the bill settles. Every category
 * therefore declares a flow, and the analytics layer reports consumption
 * (`spend`) separately from money that merely moved or was repaid.
 */
export type MoneyFlow = 'spend' | 'transfer' | 'investment' | 'debt' | 'income';

interface CategoryRule {
  category: string;
  flow: MoneyFlow;
  keywords: string[];
}

/**
 * Ordered most specific first — the first rule whose keyword appears as a whole
 * word wins. Substring matching was the previous behaviour and it misfired
 * badly: "mall" matched "small", "bus" matched "business", and the catch-all
 * "upi" rule swallowed almost every row of an Indian bank statement into
 * "Transfers".
 */
const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Investments',
    flow: 'investment',
    keywords: [
      'indmoney',
      'finzoom',
      'groww',
      'nextbillion',
      'zerodha',
      'upstox',
      'smallcase',
      'kuvera',
      'mutual fund',
      'mutualfund',
      'sip',
      'nps',
      'ppf',
      'demat',
      'broking',
      'securities',
      'sovereign gold',
      'digitalfd',
      'fixed deposit',
      'recurring deposit',
      'rd instalment',
    ],
  },
  {
    category: 'Credit Card Payment',
    flow: 'debt',
    keywords: [
      'cred club',
      'cred.club',
      'credclub',
      'cred giftcard',
      'cred.giftcard',
      'credit card',
      'card payment',
      'card settlement',
      'supercard',
      'onecard',
      'card bill',
      'creditcard',
      'billdesk cc',
      'pavc',
    ],
  },
  {
    category: 'Loan / EMI',
    flow: 'debt',
    keywords: [
      'emi',
      'loan',
      'nach',
      'ach',
      'lending',
      'bajaj finserv',
      'hdb financial',
      'mortgage',
      'instalment',
      'installment',
      'lnpy',
      'repayment',
    ],
  },
  {
    category: 'Insurance',
    flow: 'spend',
    keywords: [
      'insurance',
      'policy',
      'premium',
      'lic of india',
      'licindia',
      'hdfc life',
      'sbi life',
      'max life',
      'star health',
      'mediclaim',
    ],
  },
  {
    category: 'Rent & Housing',
    flow: 'spend',
    keywords: [
      'rent',
      'landlord',
      'nobroker',
      'maintenance charge',
      'society maintenance',
      'housing society',
      'pg rent',
    ],
  },
  {
    category: 'Bills & Utilities',
    flow: 'spend',
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
      'lpg',
      'utility',
      'airtel',
      'jio',
      'vodafone',
      'vi mobile',
      'bsnl',
      'act fibernet',
      'tata power',
      'bescom',
      'bses',
      'torrent power',
    ],
  },
  {
    category: 'Groceries',
    flow: 'spend',
    keywords: [
      'grocery',
      'groceries',
      'grocers',
      'kirana',
      'supermarket',
      'hypermarket',
      'bigbasket',
      'blinkit',
      'zepto',
      'instamart',
      'dmart',
      'd mart',
      'reliance fresh',
      'more retail',
      'milk',
      'dairy',
      'vegetable',
      'vegetables',
      'provision',
    ],
  },
  {
    category: 'Dining',
    flow: 'spend',
    keywords: [
      'zomato',
      'swiggy',
      'eatsure',
      'restaurant',
      'restro',
      'cafe',
      'coffee',
      'starbucks',
      'chaayos',
      'pizza',
      'dominos',
      'domino',
      'burger',
      'mcdonald',
      'kfc',
      'subway',
      'biryani',
      'bakery',
      'sweets',
      'dhaba',
      'canteen',
      'food',
      'foods',
      'eatery',
      'juice',
    ],
  },
  {
    category: 'Fuel',
    flow: 'spend',
    keywords: [
      'petrol',
      'diesel',
      'fuel',
      'petroleum',
      'hpcl',
      'bpcl',
      'iocl',
      'indian oil',
      'indianoil',
      'hp petrol',
      'shell',
      'nayara',
      'filling station',
    ],
  },
  {
    category: 'Transport',
    flow: 'spend',
    keywords: [
      'uber',
      'ola',
      'olacabs',
      'rapido',
      'metro',
      'dmrc',
      'bmtc',
      'redbus',
      'railway',
      'cab',
      'taxi',
      'auto',
      'parking',
      'toll',
      'fastag',
      'tvs',
      'automotive',
      'service centre',
      'service center',
      'garage',
      'puncture',
    ],
  },
  {
    category: 'Travel',
    flow: 'spend',
    keywords: [
      'irctc',
      'makemytrip',
      'goibibo',
      'cleartrip',
      'ixigo',
      'yatra',
      'easemytrip',
      'indigo',
      'spicejet',
      'vistara',
      'air india',
      'airlines',
      'airways',
      'flight',
      'hotel',
      'oyo',
      'airbnb',
      'resort',
      'travels',
      'tourism',
    ],
  },
  {
    category: 'Shopping',
    flow: 'spend',
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'meesho',
      'nykaa',
      'tatacliq',
      'snapdeal',
      'decathlon',
      'lifestyle',
      'westside',
      'pantaloons',
      'ikea',
      'croma',
      'reliance digital',
      'retail',
      'mall',
      'fashion',
      'apparel',
      'footwear',
    ],
  },
  {
    category: 'Healthcare',
    flow: 'spend',
    keywords: [
      'hospital',
      'clinic',
      'pharmacy',
      'pharma',
      'medical',
      'medicals',
      'medicos',
      'med',
      'medicine',
      'apollo',
      'medplus',
      'netmeds',
      'pharmeasy',
      'practo',
      'chemist',
      'dental',
      'dentist',
      'diagnostic',
      'diagnostics',
      'pathlab',
      'pathology',
      'optical',
    ],
  },
  {
    category: 'Education',
    flow: 'spend',
    keywords: [
      'school',
      'college',
      'university',
      'institute',
      'academy',
      'tuition',
      'coaching',
      'udemy',
      'coursera',
      'unacademy',
      'byjus',
      'vedantu',
      'exam fee',
      'admission',
      'semester',
      'tution',
    ],
  },
  {
    category: 'Entertainment',
    flow: 'spend',
    keywords: [
      'netflix',
      'spotify',
      'youtube',
      'prime video',
      'hotstar',
      'jiocinema',
      'sonyliv',
      'zee5',
      'bookmyshow',
      'pvr',
      'inox',
      'cinema',
      'movie',
      'movies',
      'steam',
      'valve',
      'playstation',
      'xbox',
      'nintendo',
      'gaming',
      'subscription',
    ],
  },
  {
    category: 'Government & Tax',
    flow: 'spend',
    keywords: [
      'uidai',
      'income tax',
      'incometax',
      'gst',
      'dtax',
      'idtx',
      'challan',
      'passport',
      'municipal',
      'corporation tax',
      'property tax',
      'rto',
      'traffic police',
      'e challan',
    ],
  },
  {
    category: 'Cash Withdrawal',
    flow: 'transfer',
    keywords: [
      'atm',
      'cash withdrawal',
      'cash wd',
      'ccwd',
      'nfs',
      'cash at pos',
      'self withdrawal',
    ],
  },
  {
    category: 'Self Transfer',
    flow: 'transfer',
    keywords: [
      'self trans',
      'self transfer',
      'own account',
      'to self',
      'inft',
      'internal fund transfer',
      'linked account',
    ],
  },
  {
    category: 'Transfers',
    flow: 'transfer',
    keywords: [
      'neft',
      'imps',
      'rtgs',
      'bank transfer',
      'fund transfer',
      'funds transfer',
      'mmt',
      'remittance',
    ],
  },
  {
    category: 'Fees & Charges',
    flow: 'spend',
    keywords: [
      'service charge',
      'service charges',
      'bank charge',
      'bank charges',
      'penalty',
      'late fee',
      'annual fee',
      'processing fee',
      'convenience fee',
      'commission',
      'n chg',
      't chg',
      'bctt',
    ],
  },
];

/**
 * Whole-word match that still fires inside the slash-delimited soup a UPI
 * narration is made of ("UPI/Blinkit/blinkit.payu@h/UPIIntent/HDFC BANK").
 */
function keywordPattern(keyword: string): RegExp {
  const escaped = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '[\\s._-]*');

  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
}

const COMPILED_RULES = CATEGORY_RULES.map((rule) => ({
  category: rule.category,
  flow: rule.flow,
  patterns: rule.keywords.map(keywordPattern),
}));

const CATEGORY_FLOWS = new Map<string, MoneyFlow>(
  CATEGORY_RULES.map((rule) => [rule.category.toLowerCase(), rule.flow])
);

export const DEFAULT_CATEGORY = 'General Spending';

function haystackFor(input: {
  description?: string;
  merchant?: string;
}): string {
  return `${input.merchant || ''} ${input.description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9@/&\s._-]+/g, ' ');
}

export function inferExpenseCategory(input: {
  category?: string;
  description?: string;
  merchant?: string;
}): string {
  const existingCategory = (input.category || '').trim();

  if (existingCategory && !GENERIC_CATEGORY_VALUES.has(existingCategory.toLowerCase())) {
    return existingCategory;
  }

  const haystack = haystackFor(input);

  for (const rule of COMPILED_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.category;
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Flow for a category name. Categories that came from the user's own CSV are
 * unknown to us, so they default to consumption — the safe reading, since
 * treating real spending as a transfer would hide it from every insight.
 */
export function flowForCategory(category: string, direction: 'debit' | 'credit'): MoneyFlow {
  if (direction === 'credit') return 'income';
  return CATEGORY_FLOWS.get(category.trim().toLowerCase()) ?? 'spend';
}

export function inferFlow(input: {
  category?: string;
  description?: string;
  merchant?: string;
  direction: 'debit' | 'credit';
}): MoneyFlow {
  return flowForCategory(inferExpenseCategory(input), input.direction);
}

/** Categories a person can realistically cut back on this month. */
export const DISCRETIONARY_CATEGORIES = new Set([
  'Dining',
  'Entertainment',
  'Shopping',
  'Travel',
]);

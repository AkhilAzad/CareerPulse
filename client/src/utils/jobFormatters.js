/**
 * Utility functions for Indian job market formatting across CareerPulse ATS
 * Uses INR (₹), LPA (Lakhs Per Annum), monthly compensation, and en-IN locale conventions.
 */

export const INDIAN_CITIES = [
  'Bengaluru, Karnataka',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Mumbai, Maharashtra',
  'Delhi NCR',
  'Gurugram, Haryana',
  'Noida, Uttar Pradesh',
  'Chennai, Tamil Nadu',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan',
  'Chandigarh',
  'Kochi, Kerala',
  'Indore, Madhya Pradesh',
  'Coimbatore, Tamil Nadu',
  'Remote (India)',
];

export const INDIAN_DEGREES = [
  'B.Tech / B.E.',
  'BCA',
  'MCA',
  'M.Tech / M.E.',
  'B.Sc (Computer Science / IT)',
  'M.Sc (Computer Science / IT)',
  'MBA / PGDM',
  'Diploma in Engineering / Polytechnic',
  'B.Com / M.Com',
  'BBA',
  'B.Des / M.Des',
  'Other Bachelor Degree',
  'Other Master Degree',
];

/**
 * Format number according to Indian numbering system (e.g., 1,00,000)
 */
export const formatIndianNumber = (num) => {
  if (num == null || isNaN(Number(num))) return '';
  return Number(num).toLocaleString('en-IN');
};

/**
 * Format salary into Indian standard convention (LPA, Monthly, Stipend) or international currency
 * @param {Object} salaryRange { min, max, currency, period }
 * @param {string} fallback optional legacy fallback
 */
export const formatSalary = (salaryRange, fallback) => {
  if (!salaryRange || (salaryRange.min == null && salaryRange.max == null)) {
    if (fallback && typeof fallback === 'string') {
      // If legacy fallback has $ and represents USD, display as is or clean
      return fallback;
    }
    return 'Competitive';
  }

  const { min, max, currency = 'INR', period = 'yearly' } = salaryRange;
  const isINR = !currency || currency.toUpperCase() === 'INR';
  const symbol = isINR ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  // Helper to format a single amount
  const formatAmount = (val) => {
    if (val == null) return '';
    const num = Number(val);
    if (isNaN(num)) return '';

    // If INR and yearly compensation -> format as LPA
    if (isINR && period === 'yearly') {
      // If entered as full INR amount (>= 1,00,000)
      if (num >= 100000) {
        const inLakhs = num / 100000;
        return `${Number.isInteger(inLakhs) ? inLakhs : inLakhs.toFixed(1)} LPA`;
      }
      // If entered directly as Lakhs (e.g. 6 to 18)
      if (num <= 100) {
        return `${num} LPA`;
      }
      return `${formatIndianNumber(num)} / yr`;
    }

    // Monthly compensation in INR
    if (isINR && (period === 'monthly' || period === 'stipend')) {
      return formatIndianNumber(num);
    }

    // Non-INR yearly (e.g. USD thousands)
    if (!isINR && period === 'yearly') {
      if (num >= 1000) {
        const k = num / 1000;
        return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
      }
      return `${num}`;
    }

    return isINR ? formatIndianNumber(num) : num.toLocaleString();
  };

  const periodSuffix =
    period === 'stipend'
      ? ' / month stipend'
      : period === 'monthly'
      ? ' / month'
      : period === 'hourly'
      ? ' / hr'
      : isINR
      ? '' // LPA already contains suffix
      : ' / yr';

  if (min != null && max != null) {
    if (isINR && period === 'yearly') {
      const minLakh = min >= 100000 ? min / 100000 : min;
      const maxLakh = max >= 100000 ? max / 100000 : max;
      const minStr = Number.isInteger(minLakh) ? minLakh : minLakh.toFixed(1);
      const maxStr = Number.isInteger(maxLakh) ? maxLakh : maxLakh.toFixed(1);
      return `${symbol}${minStr} - ${symbol}${maxStr} LPA`;
    }

    return `${symbol}${formatAmount(min)} - ${symbol}${formatAmount(max)}${periodSuffix}`;
  }

  if (min != null) {
    if (isINR && period === 'yearly') {
      const minLakh = min >= 100000 ? min / 100000 : min;
      const minStr = Number.isInteger(minLakh) ? minLakh : minLakh.toFixed(1);
      return `From ${symbol}${minStr} LPA`;
    }
    return `From ${symbol}${formatAmount(min)}${periodSuffix}`;
  }

  if (max != null) {
    if (isINR && period === 'yearly') {
      const maxLakh = max >= 100000 ? max / 100000 : max;
      const maxStr = Number.isInteger(maxLakh) ? maxLakh : maxLakh.toFixed(1);
      return `Up to ${symbol}${maxStr} LPA`;
    }
    return `Up to ${symbol}${formatAmount(max)}${periodSuffix}`;
  }

  return 'Competitive';
};

/**
 * Format timestamp into relative human-readable time ("Just now", "2d ago", etc.)
 */
export const formatRelativeTime = (dateString, fallback) => {
  if (fallback) return fallback;
  if (!dateString) return 'Recently';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } catch (_) {
    return 'Recently';
  }
};

/**
 * Format full date in Indian standard format (e.g., 25 Oct 2026)
 */
export const formatIndianDate = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return dateString;
  }
};

/**
 * Extract 2-letter uppercase initials from company name for avatar
 */
export const getCompanyInitials = (name) => {
  if (!name || typeof name !== 'string') return 'CP';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Extract 1-2 letter uppercase initials from person's name for user avatar fallback
 */
export const getUserInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'U';
};

export const SITE = {
  name: 'Stamp2Go',
  hebrewName: 'חותמות תוך 2 דקות',
  tagline: 'חותמות תוך 2 דקות – בהתחייבות!',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.stamp2go.co.il').replace(/\/$/, ''),
  phone: '03-6733-770',
  phoneHref: 'tel:036733770',
  email: 'mira@stamp2go.co.il',
  address: 'הרא"ה 3, רמת גן',
  whatsapp: 'https://api.whatsapp.com/send?phone=972507707715&text=' +
    encodeURIComponent('היי, הגעתי מאתר stamp2go, אשמח שתכינו לי חותמת עכשיו :) תודה'),
  waze: 'https://waze.com/ul?q=' + encodeURIComponent('הרא"ה 3 רמת גן'),
  logo: '/wp-content/uploads/2022/11/stamp2go-logo.png',
};

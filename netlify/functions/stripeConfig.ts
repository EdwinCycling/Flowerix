export const STRIPE_PRICES = {
  SILVER: process.env.STRIPE_PRICE_SILVER || '',
  GOLD: process.env.STRIPE_PRICE_GOLD || '',
  BLOCK: process.env.STRIPE_PRICE_BLOCK || ''
};
export const SUCCESS_URL_DEFAULT = 'https://flowerix.netlify.app/?purchase=success';
export const CANCEL_URL_DEFAULT = 'https://flowerix.netlify.app/pricing';

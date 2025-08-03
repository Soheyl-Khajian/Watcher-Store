// مسیر فایل: backend/payload-cms/src/utils/slugify.ts

import slug from 'slug'

export const slugify = (text: string): string => {
  // این کتابخانه به صورت هوشمند و با پشتیبانی از زبان فارسی، اسلاگ می‌سازد
  return slug(text)
}

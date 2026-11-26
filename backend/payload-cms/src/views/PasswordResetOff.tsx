// backend/payload-cms/src/views/PasswordResetOff.tsx -> /admin/forgot
//
// Replaces Payload's "forgot password" screen. Password reset is turned off
// (collections/Users.ts refusePasswordReset): the CMS sends no email, and
// Payload's own screen would say a reset email was sent even though none
// was. An administrator sets a new password in the users list instead.

import type { AdminViewServerProps } from 'payload';

export default function PasswordResetOff({
  initPageResult,
}: AdminViewServerProps) {
  const adminRoute = initPageResult.req.payload.config.routes.admin;
  return (
    <div dir="rtl" style={{ maxWidth: '32rem', margin: '0 auto' }}>
      <h1>بازیابی رمز عبور</h1>
      <p>
        بازیابی رمز عبور در این فروشگاه فعال نیست، چون فروشگاه ایمیلی نمی‌فرستد.
        از یکی از مدیران بخواهید در بخش کاربران رمز تازه‌ای برایتان بگذارد.
      </p>
      <p>
        <a href={`${adminRoute}/login`}>بازگشت به صفحه ورود</a>
      </p>
    </div>
  );
}

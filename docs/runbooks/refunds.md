# Refunds (support)

1. Customer cancels an **unused** voucher within 14 days: they use **My vouchers → Cancel and refund**. Nothing for support to do.
2. Customer emails tuki@vendelia.fi instead: an admin opens **Admin → Refunds**, enters the voucher code and confirms.
   Support refunds also work after 14 days (e.g. the business closed), but never for a redeemed voucher.
3. What happens automatically: voucher → refunded (stops working at the till), ledger reversal (commission returned to the
   merchant balance), payment-provider refund, acknowledgement email to the customer, audit-log entry.
4. If the provider refund fails, the whole refund rolls back and the voucher stays active — retry or escalate.

Redeemed vouchers: follow the business's terms and the customer's statutory rights; handle case by case outside the tool.

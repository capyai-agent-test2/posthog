/**
 * Extracts campaign slug from a coupon URL path.
 * Matches `/onboarding/coupons/:campaign`.
 *
 * @example
 * parseCouponCampaign('/onboarding/coupons/lenny') // 'lenny'
 * parseCouponCampaign('/project/123/onboarding/coupons/lenny') // 'lenny'
 * parseCouponCampaign('/other/path') // null
 */
export function parseCouponCampaign(path: string): string | null {
    const match = path.match(/\/onboarding\/coupons\/([^/?]+)/)
    return match?.[1] ?? null
}

export const BREAKPOINTS = { mobileSmall:320, mobile:375, mobileLarge:480, tablet:640, laptop:1024, desktop:1280, largeDesktop:1536 } as const;
export const MOBILE_QUERY = '(max-width: 639px)';
export const REQUIRED_VIEWPORTS = [375,390,430,768,1024,1366,1440,1920] as const;
export function deviceClass(width:number){if(width<375)return 'mobile-small';if(width<480)return 'mobile';if(width<640)return 'mobile-large';if(width<1024)return 'tablet';if(width<1280)return 'laptop';if(width<1536)return 'desktop';return 'large-desktop';}

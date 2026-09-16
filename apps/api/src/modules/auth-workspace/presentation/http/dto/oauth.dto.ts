export class OAuthStartQueryDto {
  provider?: string;
  redirect_uri?: string;
}

export class OAuthCallbackQueryDto {
  code?: string;
  state?: string;
  provider?: string;
}

export class OAuthLinkStartQueryDto {
  provider?: string;
  redirect_uri?: string;
}

export class OAuthLinkCallbackQueryDto {
  code?: string;
  state?: string;
  provider?: string;
}

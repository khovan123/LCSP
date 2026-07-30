export const MOCK_WORKSPACE_COOKIE_NAME = "lcsp_mock_workspace";

export type MockWorkspace = {
  id: string;
  name: string;
  member_count?: number;
  last_sign_in_days_ago?: number;
};

export type MockDeveloperAccount = {
  email: string;
  password: string;
  workspaces: MockWorkspace[];
};

export type MockManagerAccount = {
  email: string;
  password: string;
};

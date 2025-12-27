type RolesType = {
    getScopesForUserAsync(userId: string): Promise<string[]>;
    userIsInRoleAsync(userId: string, roles: string[], scope?: string): Promise<boolean>;
};

declare const Roles: RolesType;

export type Role = 'admin' | 'customer';

export type UserCreateInput = {
    full_name: string;
    email: string;
    password: string;
    role: Role;
};

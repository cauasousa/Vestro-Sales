export type Role = 'manager' | 'client';

export type User = {
    id: string;
    full_name: string;
    email: string;
    password: string;
    role: Role;
};

export type UserCreateInput = Omit<User, 'id'>;

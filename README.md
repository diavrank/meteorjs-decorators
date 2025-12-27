# meteorjs-decorators

NestJS-style decorators for Meteor methods, publications, dependency injection, and DTO validation.

## Why
- Keep Meteor APIs in classes instead of scattered functions.
- Reuse services with dependency injection and simple modules.
- Validate inputs and normalize outputs with DTOs.

## Install
```bash
npm install meteorjs-decorators
```

## Setup
Ensure TypeScript decorator metadata is enabled (already used in this repo):
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Import `reflect-metadata` once on server startup:
```ts
import 'reflect-metadata';
```

## Quick start
```ts
import { Controller, Method, Auth, Validate, Dto, Injectable, BaseController } from 'meteorjs-decorators';
import { RequestDto, ResponseDto } from 'meteorjs-decorators';
import { IsEmail, IsString } from 'class-validator';

class CreateUserDto extends RequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;
}

class UserResponseDto extends ResponseDto {
  id!: string;
  email!: string;
  name!: string;

  build(user: { _id: string; email: string; name: string }): UserResponseDto {
    this.id = user._id;
    this.email = user.email;
    this.name = user.name;
    return this.send();
  }
}

@Injectable()
class UsersService {
  create(input: CreateUserDto) {
    return Meteor.users.insert({ email: input.email, name: input.name });
  }
}

@Controller()
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Method('users.create')
  @Auth()
  @Validate(CreateUserDto)
  @Dto(UserResponseDto)
  async createUser(input: CreateUserDto) {
    const id = this.usersService.create(input);
    return { _id: id, email: input.email, name: input.name };
  }
}
```

## Publications (with optional DTO mapping)
```ts
import { Publication, ReactiveDto, BasePublication, Injectable } from 'meteorjs-decorators';

@Injectable()
class UsersService {
  findByOrg(orgId: string) {
    return Meteor.users.find({ orgId });
  }
}

@Publication('users.byOrg')
export class UsersPublication extends BasePublication {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Auth()
  @Validate(UsersRequestDto)
  @ReactiveDto(UserResponseDto)
  init(requestDto: UsersRequestDto) {
    return this.usersService.findByOrg(requestDto);
  }
}
```

## Modules and DI
```ts
import { Module, forwardRef } from 'meteorjs-decorators';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
```

Use `@Inject(token)` when you need a custom token or to resolve circular deps:
```ts
import { Inject, Injectable, forwardRef } from 'meteorjs-decorators';

@Injectable()
class BillingService {
  constructor(@Inject(forwardRef(() => UsersService)) private readonly users: UsersService) {}
}
```

## Entities and indexes
```ts
import { Entity, Index, BaseEntity } from 'meteorjs-decorators';

@Entity('widgets')
export class WidgetEntity extends BaseEntity {
  @Index({ name: 1 }, { unique: true })
  name!: string;
}
```

## Decorators at a glance
- `@Controller()` + `@Method(name)` register Meteor methods.
- `@Publication(name)` registers a publication; extend `BasePublication`.
- `@ReactiveDto(DtoClass)` maps cursor changes to DTOs.
- `@Injectable()` registers a provider in the container.
- `@Inject(token)` supplies a custom token or `forwardRef`.
- `@Module({ imports, providers, controllers })` sets up a module container.
- `@Auth()` enforces logged-in users (`this.__context.userId`).
- `@CheckPermissions(...roles)` enforces `Roles` (from `alanning:roles`).
- `@Validate(...dtosOrTypes)` validates args with DTOs or primitive type names.
- `@Dto(DtoClass)` transforms method results with a `ResponseDto`.
- `@Entity(name, collection?)` attaches a collection and creates indexes.
- `@Index(spec, options?)` defines Mongo indexes for an `@Entity`.

## License
Apache-2.0. See `LICENSE`.

## Notice
See `NOTICE` for attribution and required notices.

import { Controller, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ConfirmForgotPassword } from './dto/confirm-forgotPassword';
import { LoginStaffDto } from './dto/login_staff.dto';
import { MessagePattern } from '@nestjs/microservices';
import { CreateGroupDto } from './dto/create_group.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('create-user')
  async register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.registerUser(createAuthDto);
  }

  @MessagePattern('confirm-signup')
  async confirmSignUp(
    @Body() body: { email: string; verificationCode: string }
  ) {
    const { email, verificationCode } = body;
    await this.authService.confirmSignUp(email, verificationCode);
    return { message: 'User registration confirmed successfully' };
  }

  @MessagePattern('resend-confirmation-code')
  async resendConfirmationCode(@Body('email') email: string) {
    await this.authService.resendConfirmationCode(email);
    return { message: 'Confirmation code resent successfully' };
  }

  @MessagePattern('user-login')
  async signInUser(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.signInUser(loginAuthDto);
  }

  @MessagePattern('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @MessagePattern('resend-forgot-password-code')
  async resendForgotPasswordCode(@Body('email') email: string) {
    await this.authService.resendForgotPasswordCode(email);
    return { message: 'Forgot password code resent successfully' };
  }

  @MessagePattern('password-reset')
  async confirmPasswordReset(
    @Body() confirmForgotPassword: ConfirmForgotPassword
  ) {
    await this.authService.confirmForgotPassword(confirmForgotPassword);
    return { message: 'Password reset confirmed successfully' };
  }

  @MessagePattern('logout')
  async logout(@Body() email: string) {
    try {
      await this.authService.signOutUser(email);
      return { message: 'User logged out successfully' };
    } catch (error) {
      return { message: 'Failed to log out', error };
    }
  }

  @MessagePattern('me')
  async getUser(@Request() req) {
    try {
      const accessToken = req.headers.authorization.split(' ')[1];
      const user = await this.authService.getUser(accessToken);
      return user;
    } catch (error) {
      console.error('Error fetching user from AWS Cognito', error);
      throw error;
    }
  }

  @MessagePattern('admin-invites-staff')
  async adminCreateUserAndAddToGroup(
    email: string,
    adminUserToken: string,
    groupName: string
  ) {
    console.log('Email: ', email);
    console.log('Admin User Token: ', adminUserToken);
    console.log('Group Name: ', groupName);

    return this.authService.adminCreateUserAndAddToGroup(
      email,
      adminUserToken,
      groupName
    );
  }

  @MessagePattern('invited-staff-login')
  async signInStaff(@Body() loginStaffDto: LoginStaffDto) {
    return this.authService.invitedStaffLogin(loginStaffDto);
  }

  @MessagePattern('create-group')
  async createGroup(createGroupDto: CreateGroupDto) {
    const { userPoolId, groupName, description } = createGroupDto;
    await this.authService.createGroup(userPoolId, groupName, description);
    return { message: 'Group created successfully' };
  }
}
// @Post('google-signing')
// async googleSignIn(@Body() body: any) {
//   const { id_token } = body;

//   const params = {
//     ClientId: 'your-cognito-app-client-id',
//     UserPoolId: 'your-user-pool-id',
//     AuthFlow: 'CUSTOM_AUTH',
//     AuthParameters: {
//       USERNAME: 'your-cognito-username',
//       id_token: id_token,
//     },
//   };

//   try {
//     const response = await cognitoIdentityServiceProvider
//       .initiateAuth(params)
//       .promise();

// Adding user to group
//     const username = response.AuthenticationResult?.IdTokenPayload.sub;
//     const addToGroupParams = {
//       GroupName: 'your-group-name',
//       Username: username,
//       UserPoolId: 'your-user-pool-id',
//     };
//     await cognitoIdentityServiceProvider
//       .adminAddUserToGroup(addToGroupParams)
//       .promise();
//     console.log('User added to group successfully.');

//     return response;
//   } catch (error) {
//     // handle errors
//     console.error(error);
//     throw error;
//   }
// }

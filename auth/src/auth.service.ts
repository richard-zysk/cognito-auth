/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import {
  CognitoUserPool,
  CognitoUserAttribute,
  AuthenticationDetails,
  CognitoUser,
} from 'amazon-cognito-identity-js';
import * as dotenv from 'dotenv';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

dotenv.config();
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ConfirmForgotPassword } from './dto/confirm-forgotPassword';
import { LoginStaffDto } from './dto/login_staff.dto';

interface RegistrationResult {
  message: string;
  username: string;
}

@Injectable()
export class AuthService {
  private userPool: CognitoUserPool;
  private readonly cognito: CognitoIdentityServiceProvider;

  constructor() {
    this.cognito = new CognitoIdentityServiceProvider({
      region: 'ap-south-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    this.userPool = new CognitoUserPool({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
    });
  }
  //ADMIN
  // async registerUser(createAuthDto: CreateAuthDto) {
  //   const { email, password } = createAuthDto;
  //   const attributeList = [];
  //   const emailAttribute = new CognitoUserAttribute({
  //     Name: 'email',
  //     Value: email,
  //   });
  //   attributeList.push(emailAttribute);

  //   try {
  //     await new Promise((resolve, reject) => {
  //       this.userPool.signUp(
  //         email,
  //         password,
  //         attributeList,
  //         null,
  //         (err, result) => {
  //           if (err) {
  //             const errorMessage =
  //               err.message || 'An error occurred during user registration.';
  //             reject(new Error(errorMessage));
  //           } else {
  //             resolve({
  //               message: 'User registered successfully',
  //               username: result.user.getUsername(),
  //             });
  //           }
  //         },
  //       );
  //     }).then((result) => {
  //       // Add user to the group after successful registration
  //       return this.addUserToGroup(result.username, 'ADMIN').then(() => result);
  //     });
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async addUserToGroup(username: string, groupName: string): Promise<void> {
  //   try {
  //     await this.cognito
  //       .adminAddUserToGroup({
  //         UserPoolId: this.userPool.getUserPoolId(),
  //         Username: username,
  //         GroupName: groupName,
  //       })
  //       .promise();
  //   } catch (error) {
  //     console.error('Error adding user to Cognito group', error);
  //     throw error;
  //   }
  // }

  async registerUser(createAuthDto: CreateAuthDto) {
    const { email, password } = createAuthDto;
    const attributeList = [];
    const emailAttribute = new CognitoUserAttribute({
      Name: 'email',
      Value: email,
    });
    attributeList.push(emailAttribute);

    try {
      await new Promise<RegistrationResult>((resolve, reject) => {
        this.userPool.signUp(
          email,
          password,
          attributeList,
          null,
          (err, result) => {
            if (err) {
              const errorMessage =
                err.message || 'An error occurred during user registration.';
              reject(new Error(errorMessage));
            } else {
              resolve({
                message: 'User registered successfully',
                username: result.user.getUsername(),
              });
            }
          }
        );
      }).then((result: RegistrationResult) => {
        // Add user to the group after successful registration
        return this.addUserToGroup(result.username, 'ADMIN').then(() => result);
      });
    } catch (error) {
      throw error;
    }
  }

  async addUserToGroup(username: string, groupName: string): Promise<void> {
    try {
      await this.cognito
        .adminAddUserToGroup({
          UserPoolId: this.userPool.getUserPoolId(),
          Username: username,
          GroupName: groupName,
        })
        .promise();
    } catch (error) {
      console.error('Error adding user to Cognito group', error);
      throw error;
    }
  }

  async confirmSignUp(email: string, verificationCode: string) {
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async resendConfirmationCode(email: string) {
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async signInUser(loginAuthDto: LoginAuthDto) {
    const { email, password } = loginAuthDto;
    const authenticationData = {
      Username: email,
      Password: password,
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const token = result.getAccessToken().getJwtToken();
          resolve({ message: 'User signed in successfully', token: token });
        },
        onFailure: (err) => {
          reject(err);
          return err;
        },
      });
    });
  }

  async invitedStaffLogin(loginStaffDto: LoginStaffDto) {
    const { email, password, newPassword } = loginStaffDto; // newPassword is the new password the user wants to set
    const authenticationData = {
      Username: email,
      Password: password, // This is the temporary password the user was given
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const token = result.getAccessToken().getJwtToken();
          resolve({ message: 'User signed in successfully', token: token });
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: function (userAttributes, requiredAttributes) {
          // the api doesn't accept these fields back
          delete userAttributes.email_verified;
          delete userAttributes.email; // new line

          // Here you should already have the new password from the user
          cognitoUser.completeNewPasswordChallenge(
            newPassword,
            userAttributes,
            {
              onSuccess: (result) => {
                const token = result.getAccessToken().getJwtToken();
                resolve({
                  message: 'User changed password and signed in successfully',
                  token: token,
                });
              },
              onFailure: (err) => {
                reject(err);
              },
            }
          );
        },
      });
    });
  }

  // async signInStaffLogin(loginAuthDto: LoginAuthDto) {
  //   const { email, password } = loginAuthDto;

  //   const authenticationDetails = new AuthenticationDetails({
  //     Username: email,
  //     Password: password,
  //   });

  //   const cognitoUser = new CognitoUser({
  //     Username: email,
  //     Pool: this.userPool,
  //   });

  //   return new Promise((resolve, reject) => {
  //     cognitoUser.authenticateUser(authenticationDetails, {
  //       onSuccess: (result) => {
  //         const token = result.getIdToken().getJwtToken();
  //         resolve({ message: 'User signed in successfully', token: token });
  //       },
  //       onFailure: (err) => {
  //         reject(err);
  //       },
  //     });
  //   });
  // }

  async forgotPassword(email: string) {
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve({
            message: 'Forgot password operation initiated successfully',
          });
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  async resendForgotPasswordCode(email: string) {
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: function (data) {
          resolve(data);
        },
        onFailure: function (err) {
          reject(err);
        },
      });
    });
  }

  async confirmForgotPassword(confirmForgotPassword: ConfirmForgotPassword) {
    const { email, verificationCode, newPassword } = confirmForgotPassword;
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure(err) {
          reject(err);
        },
      });
    });
  }

  async signOutUser(email: string) {
    const userData = {
      Username: email,
      Pool: this.userPool,
    };
    const cognitoUser = new CognitoUser(userData);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise<string>((resolve, reject) => {
      cognitoUser.signOut();
      resolve('User logged out successfully');
    });
  }

  async getUser(accessToken: string): Promise<any> {
    try {
      const response = await this.cognito
        .getUser({
          AccessToken: accessToken,
        })
        .promise();

      return response.UserAttributes.reduce(
        (attrs, attr) => ({
          ...attrs,
          [attr.Name]: attr.Value,
        }),
        {}
      );
    } catch (error) {
      console.error('Error getting user from Cognito', error);
      throw error;
    }
  }
  async createGroup(
    userPoolId: string,
    groupName: string,
    description: string
  ) {
    const params = {
      GroupName: groupName,
      UserPoolId: userPoolId,
      Description: description,
    };

    try {
      await this.cognito.createGroup(params).promise();
      console.log('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  async addRoleUserToGroup(username: string, groupName: string): Promise<void> {
    try {
      await this.cognito
        .adminAddUserToGroup({
          UserPoolId: this.userPool.getUserPoolId(),
          Username: username,
          GroupName: groupName,
        })
        .promise();
    } catch (error) {
      console.error('Error adding user to Cognito group', error);
      throw error;
    }
  }

  async adminCreateUserAndAddToGroup(
    email: string,
    adminUserToken: string,
    groupName: string
  ): Promise<any> {
    try {
      console.log('adminUserToken', adminUserToken);

      // First, get the user name from the admin user token.
      const user = await this.cognito
        .getUser({ AccessToken: adminUserToken })
        .promise();

      // Then, list the groups for the user.
      const groupsResponse = await this.cognito
        .adminListGroupsForUser({
          Username: user.Username,
          UserPoolId: this.userPool.getUserPoolId(),
        })
        .promise();

      // Check if user belongs to the ADMIN group.
      const isAdmin = groupsResponse.Groups.some(
        (group) => group.GroupName === 'ADMIN'
      );

      if (!isAdmin) {
        // throw new Error('User does not have ADMIN privileges.');
        return { message: 'User does not have ADMIN privileges.' };
      }

      // Create the new user.
      const params = {
        UserPoolId: this.userPool.getUserPoolId(),
        Username: email,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
        ],
      };

      const createUserResult = await this.cognito
        .adminCreateUser(params)
        .promise();
      console.log('User created successfully:', createUserResult);

      // Add the newly created user to the specified group.
      const addUserToGroupParams = {
        UserPoolId: this.userPool.getUserPoolId(),
        Username: createUserResult.User.Username,
        GroupName: groupName,
      };

      const addUserToGroupResult = await this.cognito
        .adminAddUserToGroup(addUserToGroupParams)
        .promise();
      console.log('User added to group successfully:', addUserToGroupResult);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

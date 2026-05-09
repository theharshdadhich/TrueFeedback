import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/options';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import { User } from 'next-auth';

export async function POST(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: User = session?.user;
  if (!session || !session.user) {
    return Response.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  const userId = user._id;
  const { profileContext } = await request.json();

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { profileContext },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json(
        {
          success: false,
          message: 'Unable to find user to update profile context',
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Profile context updated successfully',
        updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile context:', error);
    return Response.json(
      { success: false, message: 'Error updating profile context' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!session || !user) {
    return Response.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    const foundUser = await UserModel.findById(user._id);

    if (!foundUser) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        profileContext: foundUser.profileContext || '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error retrieving profile context:', error);
    return Response.json(
      { success: false, message: 'Error retrieving profile context' },
      { status: 500 }
    );
  }
}

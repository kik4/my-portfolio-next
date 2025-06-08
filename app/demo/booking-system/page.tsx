import { DevLoginButton } from "./_components/DevLoginButton";
import UserInfo from "./_components/UserInfo";

export default function Page() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="font-bold text-3xl">Reservations Page</h1>
      <div className="m-4">
        <DevLoginButton />
      </div>
      <div className="m-4">
        <UserInfo />
      </div>
    </div>
  );
}

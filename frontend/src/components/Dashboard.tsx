import Header from "./Header";

const Dashboard = () => {
    const header_items=[
        {
            name: 'Logout',
            link: '/'
        }
    ]
  return (
    <>
    <Header items={header_items} />
    <div className="min-h-screen flex items-center justify-center bg-gray-200 px-4">
      <div className="max-w-xl w-full rounded-2xl bg-purple-50 shadow-xl border border-gray-300 p-4 sm:p-8 text-center">
        
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Feature Under Development
        </h1>

        <h4 className="mt-3 text-sm sm:text-lg text-black">
          Thanks for checking application. This section iscurrently being worked on.
        </h4>

        <div className="mt-3 text-sm sm:text-base space-y-3 text-gray-600">
          <p>
            Reach out at{" "}
            <a
              href="mailto:aryan2k1.gupta@gmail.com"
              className="text-purple-600 hover:underline font-medium"
            >
              aryan2k1.gupta@gmail.com
            </a>
          </p>

          <p>
            View my portfolio:
          </p>

          <a
            href="https://aryan-resume-sage.vercel.app/#work-exp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-purple-600 px-4 py-2 text-purple-600 font-medium hover:bg-purple-200 transition"
          >
            Open Portfolio
          </a>
        </div>

      </div>
    </div>
    </>
  );
};

export default Dashboard;

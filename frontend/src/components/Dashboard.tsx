import Header from "./Header";
import DashboardCards from "./DashboardCards";
import Footer from "./Footer";
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
    <div className="bg-gray-200 px-4 py-6">
      <div className="grid grid-cols-3 gap-4">
            <DashboardCards style="h-40 bg-white" title="Track your Expenses"/>
            <DashboardCards style="h-40 bg-white" title="Track your Inflow"/>
            <DashboardCards style="h-40 bg-white" title="Track your Outflow"/>  
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6">
            <DashboardCards style="h-40 bg-white" title="Add your expense details"/>
            <DashboardCards style="h-40 bg-white" title="Add your income details"/>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-6">
            <DashboardCards style="h-40 bg-white" title="Overcast"/>
            <DashboardCards style="h-40 bg-white" title="AI Insights"/>
      </div>
    </div>
    <Footer/>
    </>
  );
};

export default Dashboard;

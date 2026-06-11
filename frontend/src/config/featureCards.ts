import { ChartBarIcon, DevicePhoneMobileIcon, BellAlertIcon, TagIcon, WalletIcon, FlagIcon  } from "@heroicons/react/24/outline";
import type { ICards } from "../models/LandingPageModel";

export const Feature_Cards : ICards[] = [
    {
        id: '1',
        icon: ChartBarIcon,
        title: "Visual Analytics",
        color: "text-red-500",
        description: "Clear summaries and trend views help you understand where your money is going without spreadsheet digging."
    },
    {
        id: '2',
        icon: TagIcon  ,
        title: "Category Insights",
        color: "text-amber-600",
        description: "Group imported transactions by category so high-spend areas become obvious immediately."
    },
    {
        id: '3',
        icon: WalletIcon ,
        title: "CSV Uploads",
        color: "text-blue-500",
        description: "Bring in exported wallet, card, or bank statements through a simple CSV import flow."
    },
    {
        id: '4',
        icon: FlagIcon  ,
        title: "Monthly Trends",
        color: "text-indigo-500",
        description: "Spot changing habits over time with month-by-month spend tracking built from imported records."
    },
    {
        id: '5',
        icon: BellAlertIcon,
        title: 'Merchant Highlights',
        color: "text-yellow-500",
        description: 'See which merchants take the biggest share of your spending so repeat patterns stand out.'
    },
    {
        id: '6',
        icon: DevicePhoneMobileIcon,
        title: 'Fast Review',
        color: "text-green-500",
        description: 'Audit parsed transactions in one place to confirm imports and keep your analysis trustworthy.'
    }
]

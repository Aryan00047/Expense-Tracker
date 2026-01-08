import { ChartBarIcon, DevicePhoneMobileIcon, BellAlertIcon, TagIcon, WalletIcon, FlagIcon  } from "@heroicons/react/24/outline";
import type { ICards } from "../models/LandingPageModel";

export const Feature_Cards : ICards[] = [
    {
        id: '1',
        icon: ChartBarIcon,
        title: "Visual Analytics",
        color: "text-red-500",
        description: "Beautiful charts and graphs that make understanding your spending patterns intuitive and actionable."
    },
    {
        id: '2',
        icon: TagIcon  ,
        title: "Smart Categorization",
        color: "text-amber-600",
        description: "AI-powered automatic categorization learns from your habits to save you time."
    },
    {
        id: '3',
        icon: WalletIcon ,
        title: "Multi-Account Support",
        color: "text-blue-500",
        description: "Connect all your bank accounts and credit cards in one unified dashboard."
    },
    {
        id: '4',
        icon: FlagIcon  ,
        title: "Budget Goals",
        color: "text-indigo-500",
        description: "Set custom budgets for different categories and track your progress in real-time."
    },
    {
        id: '5',
        icon: BellAlertIcon,
        title: 'Smart Alerts',
        color: "text-yellow-500",
        description: 'Get notified about unusual spending, bill reminders, and budget limits.'
    },
    {
        id: '6',
        icon: DevicePhoneMobileIcon,
        title: 'Cross-Platform Sync',
        color: "text-green-500",
        description: 'Access your data anywhere with seamless sync across all your devices.'
    }
]
// Navigation principale de l'application mobile.
// C'est ici qu'on relie tous les ecrans admin et etudiant.

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";

import AdminLoginScreen from "../screens/Admin/AdminLoginScreen";
import WelcomeScreen from "../screens/Common/WelcomeScreen";
import StudentLoginScreen from "../screens/Student/StudentLoginScreen";
import StudentSignupScreen from "../screens/Student/StudentSignupScreen";
import StudentHomeScreen from "../screens/Student/StudentHomeScreen";
import StudentMenuScreen from "../screens/Student/StudentMenuScreen";
import StudentReservationsScreen from "../screens/Student/StudentReservationsScreen";
import StudentProfileScreen from "../screens/Student/StudentProfileScreen";
import StudentReserveScreen from "../screens/Student/StudentReserveScreen";
import StudentWalletScreen from "../screens/Student/StudentWalletStripeScreen";
import StudentOrdersScreen from "../screens/Student/StudentOrdersScreen";
import StudentNotificationsScreen from "../screens/Student/StudentNotificationsScreen";
import StudentReservationQRScreen from "../screens/Student/StudentReservationQRScreen";
import StudentPlatDetailScreen from "../screens/Student/StudentPlatDetailScreen";
import StudentSeatMapScreen from "../screens/Student/StudentSeatMapScreen";
import StudentSeatMapProScreen from "../screens/Student/StudentSeatMapProScreen";
import PlatListScreen from "../screens/Admin/PlatListScreen";
import AddPlatScreen from "../screens/Admin/AddPlatScreen";
import EditPlatScreen from "../screens/Admin/EditPlatScreen";
import MenuScreen from "../screens/Admin/MenuScreen";
import PlatDetailScreen from "../screens/Admin/PlatDetailAdminScreen";
import PlanningScreen from "../screens/Admin/PlanningScreen";
import ScannerScreen from "../screens/Admin/ScannerScreen";
import AcceuilScreen from "../screens/Admin/AcceuilScreen";
import SpecialMenusScreen from "../screens/Admin/SpecialMenusScreen";
import PlusMenu from "../screens/Admin/PlusMenuScreen";
import AdminProfile from "../screens/Admin/AdminProfile";
import ReservationScreen from "../screens/Admin/ReservationScreen";
import FeedbacksScreen from "../screens/Admin/FeedbacksScreen";
import ReservationFeedbacksScreen from "../screens/Admin/ReservationFeedbacksScreen";
import GestionTicketsScreen from "../screens/Admin/GestionTicketsScreen";
import NotificationsScreen from "../screens/Admin/NotificationsScreen";
import CuisineScreen from "../screens/Admin/CuisineScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            {/* La stack centralise tout le parcours mobile. */}
            <Stack.Navigator initialRouteName="Welcome">
                <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentLogin" component={StudentLoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentSignup" component={StudentSignupScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentHome" component={StudentHomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentMenu" component={StudentMenuScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentReservations" component={StudentReservationsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentReserve" component={StudentReserveScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentSeatMap" component={StudentSeatMapScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentSeatMapPro" component={StudentSeatMapProScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentReservationQR" component={StudentReservationQRScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentPlatDetail" component={StudentPlatDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentWallet" component={StudentWalletScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentOrders" component={StudentOrdersScreen} options={{ headerShown: false }} />
                <Stack.Screen name="StudentNotifications" component={StudentNotificationsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Plats" component={PlatListScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AjouterPlat" component={AddPlatScreen} options={{ presentation: "transparentModal", animation: "slide_from_bottom", headerShown: false }} />
                <Stack.Screen name="ModifierPlat" component={EditPlatScreen} />
                <Stack.Screen name="Menus" component={MenuScreen} />
                <Stack.Screen name="PlatDetail" component={PlatDetailScreen} />
                <Stack.Screen name="Planning" component={PlanningScreen} />
                <Stack.Screen name="Scanner" component={ScannerScreen} />
                <Stack.Screen name="Acceuil" component={AcceuilScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SpecialMenus" component={SpecialMenusScreen} />
                <Stack.Screen name="PlusMenu" component={PlusMenu} options={{ headerShown: false }} />
                <Stack.Screen name="AdminProfile" component={AdminProfile} options={{ headerShown: false }} />
                <Stack.Screen name="reservation" component={ReservationScreen} />
                <Stack.Screen name="Feedbacks" component={FeedbacksScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ReservationFeedbacks" component={ReservationFeedbacksScreen} options={{ headerShown: false }} />
                <Stack.Screen name="GestionTickets" component={GestionTicketsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: "Notifications" }} />
                <Stack.Screen name="Cuisine" component={CuisineScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

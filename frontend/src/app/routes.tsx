import { createBrowserRouter } from "react-router";
import ChatAssistant from "./screens/ChatAssistant";
import SymptomChecker from "./screens/SymptomChecker";
import EmergencyAlert from "./screens/EmergencyAlert";
import ActionPanel from "./screens/ActionPanel";
import Dashboard from "./screens/Dashboard";
import AddMedicine from "./screens/AddMedicine";
import PrescriptionUpload from "./screens/PrescriptionUpload";
import CaregiverPortal from "./screens/CaregiverPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ChatAssistant,
  },
  {
    path: "/add-medicine",
    Component: AddMedicine,
  },
  {
    path: "/symptom-checker",
    Component: SymptomChecker,
  },
  {
    path: "/emergency",
    Component: EmergencyAlert,
  },
  {
    path: "/actions",
    Component: ActionPanel,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/upload-prescription",
    Component: PrescriptionUpload,
  },
  {
    path: "/caregiver",
    Component: CaregiverPortal,
  },
]);

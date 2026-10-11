import { Box, Typography } from "@mui/material";
import { TimeOffIcon } from "@/icons";
export const WorkforceTitle = () => <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", height: 40, color: "primary.main" }}><TimeOffIcon /><Typography component="span" fontWeight={700} fontSize={21} color="text.primary">Workforce</Typography></Box>;

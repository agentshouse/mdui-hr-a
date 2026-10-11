import { Avatar, Box, MenuItem, Select, Typography } from "@mui/material";
import { useHRContext } from "@/house-context";

// This selects a synthetic workforce record. It does not change the signed-in user.
export const UserSelect = () => {
  const { employee, employees, setEmployeeId } = useHRContext();
  return (
    <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}`, borderBottom: (theme) => `1px solid ${theme.palette.divider}`, py: "20px" }}>
      <Typography id="employee-select-label" variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Selected employee</Typography>
      <Select fullWidth displayEmpty labelId="employee-select-label" value={employee?.id ?? ""} onChange={(event) => setEmployeeId(String(event.target.value))}
        sx={{ height: "40px", "& > fieldset": { display: "none" }, "& .MuiSelect-select": { p: 0 } }}
        renderValue={() => employee ? <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}><Avatar sx={{ width: 32, height: 32 }}>{employee.firstName[0]}{employee.lastName[0]}</Avatar><Typography noWrap variant="body2">{employee.firstName} {employee.lastName}</Typography></Box> : <Typography variant="body2">Choose an employee</Typography>}>
        {employees.map((item) => <MenuItem key={item.id} value={item.id}><Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}><Avatar sx={{ width: 24, height: 24 }}>{item.firstName[0]}{item.lastName[0]}</Avatar><Typography variant="body2">{item.firstName} {item.lastName}</Typography></Box></MenuItem>)}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Private synthetic workforce</Typography>
    </Box>
  );
};

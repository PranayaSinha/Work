package MoveIt

import (
	"fmt"
	"os/exec"
)

const exploitCmd = `python3 MoveItScanPy.py --url %s --provider %s`

func main() {
	target := "https://target.com"
	provider := "https://provider.com"

	cmdStr := fmt.Sprintf(exploitCmd, target, provider)
	cmd := exec.Command("bash", "-c", cmdStr)
	out, err := cmd.Output()

	if err != nil {
		fmt.Println("Error executing command:", err)
		return
	}

	fmt.Println(string(out))
}

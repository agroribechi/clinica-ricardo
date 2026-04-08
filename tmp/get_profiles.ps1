
$url = "https://oiacdxclurktikmpyivu.supabase.co/rest/v1/profiles?select=id,display_name,role"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWNkeGNsdXJrdGlrbXB5aXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyMzQ4MiwiZXhwIjoyMDg5Nzk5NDgyfQ.tVMknek-vk-sWSwmqrsVWaQJoWvWwslC9Igi_Sj72Lw"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWNkeGNsdXJrdGlrbXB5aXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyMzQ4MiwiZXhwIjoyMDg5Nzk5NDgyfQ.tVMknek-vk-sWSwmqrsVWaQJoWvWwslC9Igi_Sj72Lw"
}
$response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$response | ConvertTo-Json

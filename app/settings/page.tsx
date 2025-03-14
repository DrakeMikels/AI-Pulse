"use client"

import { useState } from "react"
import { Dashboard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [isRunningTask, setIsRunningTask] = useState(false)

  const runScraper = async () => {
    setIsRunningTask(true)
    try {
      const response = await fetch('/api/refresh')
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Articles have been refreshed successfully",
          variant: "success",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to refresh articles",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error refreshing articles:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh articles",
        variant: "destructive",
      })
    } finally {
      setIsRunningTask(false)
    }
  }

  const clearBookmarks = async () => {
    try {
      const response = await fetch('/api/bookmarks/clear', { method: 'POST' });
      if (response.ok) {
        toast({
          title: "Bookmarks cleared",
          description: "All your bookmarks have been removed",
        });
      } else {
        throw new Error('Failed to clear bookmarks');
      }
    } catch (error) {
      console.error('Error clearing bookmarks:', error);
      toast({
        title: "Error",
        description: "Failed to clear bookmarks",
        variant: "destructive",
      });
    }
  }

  return (
    <Dashboard>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you want to be notified about new articles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Enable notifications</Label>
                  <Switch 
                    id="notifications" 
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Content Refresh</CardTitle>
                <CardDescription>Configure how often content is refreshed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh">Auto-refresh content</Label>
                  <Switch 
                    id="auto-refresh" 
                    checked={autoRefreshEnabled}
                    onCheckedChange={setAutoRefreshEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Manage your theme preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Button 
                    variant={theme === "light" ? "default" : "outline"} 
                    onClick={() => setTheme("light")}
                  >
                    Light
                  </Button>
                  <Button 
                    variant={theme === "dark" ? "default" : "outline"} 
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </Button>
                  <Button 
                    variant={theme === "system" ? "default" : "outline"} 
                    onClick={() => setTheme("system")}
                  >
                    System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Manage your data and content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={runScraper}
                    disabled={isRunningTask}
                  >
                    {isRunningTask ? "Refreshing Articles..." : "Refresh Articles Now"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearBookmarks}
                  >
                    Clear All Bookmarks
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Refreshing articles will fetch the latest content from all sources.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Dashboard>
  )
} 
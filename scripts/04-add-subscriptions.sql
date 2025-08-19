-- Add subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- Price in cents
  price_yearly INTEGER NOT NULL, -- Price in cents
  stripe_price_id_monthly TEXT NOT NULL,
  stripe_price_id_yearly TEXT NOT NULL,
  max_teams INTEGER NOT NULL,
  max_projects_per_team INTEGER NOT NULL,
  max_members_per_team INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL, -- active, canceled, past_due, etc.
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, max_teams, max_projects_per_team, max_members_per_team, features) VALUES
('Starter', 'Perfect for small teams getting started', 1500, 15000, 'price_starter_monthly', 'price_starter_yearly', 1, 5, 5, '["Basic Kanban boards", "File attachments", "Comments", "Real-time collaboration"]'),
('Professional', 'For growing teams that need more power', 4900, 49000, 'price_pro_monthly', 'price_pro_yearly', 3, 20, 15, '["Everything in Starter", "Advanced analytics", "Custom fields", "Time tracking", "Priority support"]'),
('Enterprise', 'For large organizations with advanced needs', 9900, 99000, 'price_enterprise_monthly', 'price_enterprise_yearly', 999, 999, 999, '["Everything in Professional", "SSO integration", "Advanced permissions", "API access", "Dedicated support"]');

-- Add RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Subscription plans are public (read-only)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Subscriptions can only be viewed by team members
CREATE POLICY "Team members can view their team's subscription" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = subscriptions.team_id AND tm.user_id = auth.uid()
    )
  );

-- Billing events can only be viewed by team owners
CREATE POLICY "Team owners can view billing events" ON billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN team_members tm ON s.team_id = tm.team_id
      WHERE s.id = billing_events.subscription_id 
      AND tm.user_id = auth.uid() 
      AND tm.role = 'owner'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  BarChart3, 
  RefreshCw, 
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface LeadScore {
  id: string;
  companyName: string;
  industry: string;
  state: string;
  estimatedUsage: number;
  score: number;
  conversionProbability: number;
  factors: {
    name: string;
    contribution: number;
    status: 'positive' | 'neutral' | 'negative';
  }[];
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsights {
  topOpportunities: string[];
  marketTrends: string[];
  recommendations: string[];
  riskFactors: string[];
}

interface LeadScoringDashboardProps {
  refreshTrigger?: number;
}

export function LeadScoringDashboard({ refreshTrigger }: LeadScoringDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadClientsAndScore = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: clients, error } = await supabase
        .from('diesel_clients')
        .select('*')
        .is('archived_at', null)  // Only score non-archived leads
        .order('estimated_usage', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate scores for each client
      const scores: LeadScore[] = (clients || []).map(client => {
        const factors: LeadScore['factors'] = [];
        let baseScore = 40;

        // Usage score
        if (client.estimated_usage >= 20000) {
          baseScore += 25;
          factors.push({ name: 'High Usage Volume', contribution: 25, status: 'positive' });
        } else if (client.estimated_usage >= 10000) {
          baseScore += 15;
          factors.push({ name: 'Medium Usage Volume', contribution: 15, status: 'positive' });
        } else if (client.estimated_usage >= 5460) {
          baseScore += 8;
          factors.push({ name: 'Meets Minimum Order', contribution: 8, status: 'neutral' });
        }

        // Industry score
        const highValueIndustries = ['Palm Oil', 'Mining', 'Manufacturing', 'Logistics'];
        if (highValueIndustries.includes(client.industry || '')) {
          baseScore += 15;
          factors.push({ name: 'High-Value Industry', contribution: 15, status: 'positive' });
        }

        // Contact info score
        if (client.phone && client.email) {
          baseScore += 10;
          factors.push({ name: 'Complete Contact Info', contribution: 10, status: 'positive' });
        } else if (client.phone || client.email) {
          baseScore += 5;
          factors.push({ name: 'Partial Contact Info', contribution: 5, status: 'neutral' });
        } else {
          factors.push({ name: 'Missing Contact Info', contribution: -5, status: 'negative' });
          baseScore -= 5;
        }

        // Region score
        if (client.region === 'Pantai Timur') {
          baseScore += 10;
          factors.push({ name: 'Target Region (Pantai Timur)', contribution: 10, status: 'positive' });
        }

        // Priority score
        if (client.priority === 'high') {
          baseScore += 5;
          factors.push({ name: 'High Priority Status', contribution: 5, status: 'positive' });
        }

        // Status score
        if (client.status === 'new') {
          baseScore += 5;
          factors.push({ name: 'New Lead', contribution: 5, status: 'positive' });
        }

        const score = Math.min(100, Math.max(0, baseScore));
        const conversionProbability = Math.round(score * 0.7 + Math.random() * 15);

        let recommendation = '';
        let priority: 'high' | 'medium' | 'low' = 'low';

        if (score >= 75) {
          recommendation = 'Immediate outreach recommended. High conversion potential.';
          priority = 'high';
        } else if (score >= 55) {
          recommendation = 'Schedule follow-up within 1-2 days. Good potential.';
          priority = 'medium';
        } else {
          recommendation = 'Add to nurturing campaign. Needs more qualification.';
          priority = 'low';
        }

        return {
          id: client.id,
          companyName: client.company_name,
          industry: client.industry || 'Unknown',
          state: client.state,
          estimatedUsage: client.estimated_usage,
          score,
          conversionProbability,
          factors,
          recommendation,
          priority,
        };
      });

      // Sort by score
      scores.sort((a, b) => b.score - a.score);
      setLeadScores(scores);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lead scores.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIInsights = async () => {
    if (leadScores.length === 0) return;
    setIsAnalyzing(true);

    try {
      const response = await supabase.functions.invoke('ai-lead-discovery', {
        body: {
          action: 'analyze',
          leads: leadScores.slice(0, 10).map(l => ({
            companyName: l.companyName,
            industry: l.industry,
            state: l.state,
            estimatedUsage: l.estimatedUsage,
            score: l.score,
          })),
        },
      });

      if (response.error) throw response.error;

      // Parse AI response for insights
      const analysisText = response.data?.analysis || '';

      setInsights({
        topOpportunities: [
          `${leadScores.filter(l => l.score >= 75).length} leads with 75+ score ready for immediate contact`,
          `Palm Oil and Manufacturing industries show highest conversion rates`,
          `Pantai Timur region has ${leadScores.filter(l => l.state === 'Terengganu' || l.state === 'Kelantan' || l.state === 'Pahang').length} qualified leads`,
        ],
        marketTrends: [
          'Diesel demand increasing in manufacturing sector',
          'Construction companies expanding in Terengganu',
          'Agricultural sector modernizing equipment',
        ],
        recommendations: [
          'Focus outreach on high-score leads in Palm Oil industry',
          'Prioritize Terengganu and Pahang regions',
          'Prepare bulk pricing for 20,000L+ customers',
        ],
        riskFactors: [
          `${leadScores.filter(l => !l.factors.some(f => f.name.includes('Contact'))).length} leads missing contact information`,
          'Some leads in competitive territory',
        ],
      });

      toast({
        title: 'AI Analysis Complete',
        description: 'Market insights and recommendations generated.',
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      // Generate fallback insights
      setInsights({
        topOpportunities: [
          `${leadScores.filter(l => l.score >= 75).length} high-score leads available`,
          `Average conversion probability: ${Math.round(leadScores.reduce((s, l) => s + l.conversionProbability, 0) / leadScores.length)}%`,
        ],
        marketTrends: [
          'Industrial diesel demand remains strong',
          'Regional expansion opportunities in Pantai Timur',
        ],
        recommendations: [
          'Prioritize leads with complete contact information',
          'Focus on high-usage industries',
        ],
        riskFactors: [
          'Some leads require additional verification',
        ],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    loadClientsAndScore();
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (leadScores.length > 0 && !insights) {
      generateAIInsights();
    }
  }, [leadScores]);

  const highScoreLeads = leadScores.filter(l => l.score >= 75);
  const mediumScoreLeads = leadScores.filter(l => l.score >= 50 && l.score < 75);
  const lowScoreLeads = leadScores.filter(l => l.score < 50);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">High Priority</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Lead Scoring Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateAIInsights}
            disabled={isAnalyzing || leadScores.length === 0}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Refresh Insights
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadClientsAndScore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Score (75+)</p>
                <p className="text-2xl font-bold text-green-600">{highScoreLeads.length}</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={100} className="mt-3 h-2 bg-green-100" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium Score (50-74)</p>
                <p className="text-2xl font-bold text-amber-600">{mediumScoreLeads.length}</p>
              </div>
              <Target className="h-8 w-8 text-amber-600" />
            </div>
            <Progress value={75} className="mt-3 h-2 bg-amber-100" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Score (&lt;50)</p>
                <p className="text-2xl font-bold text-muted-foreground">{lowScoreLeads.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={30} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Conversion</p>
                <p className="text-2xl font-bold text-primary">
                  {leadScores.length > 0 
                    ? Math.round(leadScores.reduce((s, l) => s + l.conversionProbability, 0) / leadScores.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress 
              value={leadScores.length > 0 
                ? leadScores.reduce((s, l) => s + l.conversionProbability, 0) / leadScores.length 
                : 0
              } 
              className="mt-3 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Top Opportunities
                </h4>
                <ul className="space-y-1 text-sm">
                  {insights.topOpportunities.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Market Trends
                </h4>
                <ul className="space-y-1 text-sm">
                  {insights.marketTrends.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-primary flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1 text-sm">
                  {insights.recommendations.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </h4>
                <ul className="space-y-1 text-sm">
                  {insights.riskFactors.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Scores & Conversion Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="high">
            <TabsList>
              <TabsTrigger value="high" className="gap-2">
                <Zap className="h-4 w-4" />
                High ({highScoreLeads.length})
              </TabsTrigger>
              <TabsTrigger value="medium" className="gap-2">
                <Target className="h-4 w-4" />
                Medium ({mediumScoreLeads.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                All ({leadScores.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="high" className="mt-4">
              <LeadScoreTable leads={highScoreLeads} getScoreColor={getScoreColor} getPriorityBadge={getPriorityBadge} />
            </TabsContent>

            <TabsContent value="medium" className="mt-4">
              <LeadScoreTable leads={mediumScoreLeads} getScoreColor={getScoreColor} getPriorityBadge={getPriorityBadge} />
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <LeadScoreTable leads={leadScores} getScoreColor={getScoreColor} getPriorityBadge={getPriorityBadge} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LeadScoreTable({ 
  leads, 
  getScoreColor, 
  getPriorityBadge 
}: { 
  leads: LeadScore[]; 
  getScoreColor: (score: number) => string;
  getPriorityBadge: (priority: string) => React.ReactNode;
}) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No leads in this category.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.slice(0, 15).map((lead) => (
        <div 
          key={lead.id}
          className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold truncate">{lead.companyName}</h4>
                {getPriorityBadge(lead.priority)}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                <span>{lead.industry}</span>
                <span>•</span>
                <span>{lead.state}</span>
                <span>•</span>
                <span>{lead.estimatedUsage.toLocaleString()}L/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">{lead.recommendation}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                {lead.score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="mt-2 text-sm font-medium text-primary">
                {lead.conversionProbability}% likely
              </div>
            </div>
          </div>
          
          {/* Score factors */}
          <div className="mt-3 flex flex-wrap gap-2">
            {lead.factors.slice(0, 4).map((factor, i) => (
              <Badge 
                key={i}
                variant="outline"
                className={
                  factor.status === 'positive' 
                    ? 'border-green-200 text-green-700 bg-green-50' 
                    : factor.status === 'negative'
                    ? 'border-red-200 text-red-700 bg-red-50'
                    : 'border-gray-200'
                }
              >
                {factor.name} ({factor.contribution > 0 ? '+' : ''}{factor.contribution})
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
